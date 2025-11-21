import './config.js';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// Import backend services (shared code)
import Job from '../backend/src/models/Job.js';
import logger from '../backend/utils/logger.js';
import { splitTextIntoScenes } from '../backend/src/services/ai/textSplitter.js';
import { generateSceneImage } from '../backend/src/services/ai/imageGenerator.js';
import { generateSceneAudio } from '../backend/src/services/ai/ttsGenerator.js';
import renderService from '../backend/src/services/video/renderService.js';

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Worker: MongoDB connected successfully');
    logger.info('Worker: MongoDB connected');
  } catch (error) {
    console.error('Worker: MongoDB connection error:', error);
    logger.error('Worker: MongoDB connection error:', error);
    process.exit(1);
  }
}

// Wait for MongoDB connection before starting worker
await connectDB();

/**
 * Main video generation processor
 */
async function processVideoGeneration(job) {
  const { jobId, text, voiceId, imageStyle, musicEnabled, subtitlesEnabled } = job.data;
  
  logger.info(`Processing video generation job: ${jobId}`);
  
  try {
    // Find job document
    const jobDoc = await Job.findOne({ jobId });
    if (!jobDoc) {
      throw new Error('Job document not found');
    }

    // Update status
    jobDoc.status = 'processing';
    await jobDoc.save();

    // Step 1: Split text into scenes (10%)
    await jobDoc.updateProgress(10, 'Splitting text into scenes');
    logger.info(`[${jobId}] Step 1: Splitting text`);
    
    const sceneTexts = splitTextIntoScenes(text);
    logger.info(`[${jobId}] Created ${sceneTexts.length} scenes`);

    // Step 2: Generate images for each scene (10% to 40%)
    await jobDoc.updateProgress(15, 'Generating AI images');
    logger.info(`[${jobId}] Step 2: Generating images`);
    
    const scenes = [];
    const progressPerScene = 25 / sceneTexts.length;
    
    for (let i = 0; i < sceneTexts.length; i++) {
      const sceneText = sceneTexts[i];
      
      logger.info(`[${jobId}] Generating image ${i + 1}/${sceneTexts.length}`);
      const imagePath = await generateSceneImage(sceneText, i, imageStyle);
      
      scenes.push({
        sceneIndex: i,
        text: sceneText,
        imagePath,
        audioPath: null,
        duration: 0
      });
      
      const progress = 15 + ((i + 1) * progressPerScene);
      await jobDoc.updateProgress(Math.round(progress), `Generated image ${i + 1}/${sceneTexts.length}`);
      
      // Add delay to avoid API rate limits
      if (i < sceneTexts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Step 3: Generate audio for each scene (40% to 65%)
    await jobDoc.updateProgress(40, 'Generating TTS audio');
    logger.info(`[${jobId}] Step 3: Generating audio`);
    
    const audioProgressPerScene = 25 / scenes.length;
    
    for (let i = 0; i < scenes.length; i++) {
      logger.info(`[${jobId}] Generating audio ${i + 1}/${scenes.length}`);
      
      const { audioPath, duration } = await generateSceneAudio(
        scenes[i].text,
        i,
        voiceId
      );
      
      scenes[i].audioPath = audioPath;
      scenes[i].duration = duration;
      
      const progress = 40 + ((i + 1) * audioProgressPerScene);
      await jobDoc.updateProgress(Math.round(progress), `Generated audio ${i + 1}/${scenes.length}`);
      
      // Add delay to avoid API rate limits
      if (i < scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update job document with scene data
    jobDoc.scenes = scenes.map(s => ({
      sceneIndex: s.sceneIndex,
      text: s.text,
      duration: s.duration
    }));
    jobDoc.metadata.totalScenes = scenes.length;
    await jobDoc.save();

    // Step 4: Render video (65% to 95%)
    await jobDoc.updateProgress(65, 'Rendering video');
    logger.info(`[${jobId}] Step 4: Rendering video`);
    
    const renderResult = await renderService.renderVideo(scenes, {
      jobId,
      musicEnabled,
      subtitlesEnabled
    });

    await jobDoc.updateProgress(95, 'Finalizing');

    // Step 5: Mark as completed (100%)
    await jobDoc.markCompleted(renderResult.videoUrl, renderResult.videoKey);
    jobDoc.thumbnailUrl = renderResult.thumbnailUrl;
    jobDoc.duration = renderResult.metadata.duration;
    jobDoc.metadata = {
      ...jobDoc.metadata,
      ...renderResult.metadata
    };
    await jobDoc.save();

    logger.info(`[${jobId}] Video generation completed successfully`);
    
    return {
      success: true,
      jobId,
      videoUrl: renderResult.videoUrl
    };

  } catch (error) {
    logger.error(`[${jobId}] Video generation failed:`, error);
    
    // Mark job as failed
    const jobDoc = await Job.findOne({ jobId });
    if (jobDoc) {
      await jobDoc.markFailed(error.message);
    }
    
    throw error;
  }
}

// Create worker
const worker = new Worker('video-generation', processVideoGeneration, {
  connection,
  concurrency: 1, // Process one job at a time per worker instance
  limiter: {
    max: 10, // Max 10 jobs
    duration: 60000 // per 60 seconds
  }
});

// Worker event listeners
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

worker.on('stalled', (jobId) => {
  logger.warn(`Job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker gracefully');
  logger.info('SIGTERM received, closing worker gracefully');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker gracefully');
  logger.info('SIGINT received, closing worker gracefully');
  await worker.close();
  await connection.quit();
  await mongoose.connection.close();
  process.exit(0);
});

console.log('========================================');
console.log('Worker started and waiting for jobs...');
console.log(`Worker concurrency: ${worker.opts.concurrency}`);
console.log(`Connected to Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
console.log('========================================');

logger.info('Worker started and waiting for jobs...');
logger.info(`Worker concurrency: ${worker.opts.concurrency}`);
logger.info(`Connected to Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
