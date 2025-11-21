import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import Job from '../models/Job.js';
import videoQueue from '../services/queue.js';
import spacesClient from '../utils/spacesClient.js';
import logger from '../utils/logger.js';

/**
 * Validation schema for video generation request
 */
const generateVideoSchema = Joi.object({
  text: Joi.string().min(10).max(5000).required(),
  voiceId: Joi.string().default('default'),
  imageStyle: Joi.string().valid('realistic', 'cinematic', 'anime', 'digital_art', 'oil_painting', 'cartoon').default('realistic'),
  musicEnabled: Joi.boolean().default(true),
  subtitlesEnabled: Joi.boolean().default(true)
});

/**
 * POST /api/generate
 * Generate a new video from text
 */
export async function generateVideo(req, res) {
  try {
    // Validate request body
    const { error, value } = generateVideoSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    const { text, voiceId, imageStyle, musicEnabled, subtitlesEnabled } = value;

    // Create job ID
    const jobId = uuidv4();

    // Create job document
    const job = new Job({
      jobId,
      inputText: text,
      status: 'pending',
      progress: 0,
      currentStep: 'queued',
      settings: {
        voiceId,
        imageStyle,
        musicEnabled,
        subtitlesEnabled
      }
    });

    await job.save();

    // Enqueue job to BullMQ
    await videoQueue.add('video-generation', {
      jobId,
      text,
      voiceId,
      imageStyle,
      musicEnabled,
      subtitlesEnabled
    }, {
      jobId // Use jobId as Bull job ID for easy tracking
    });

    logger.info(`Video generation job created: ${jobId}`);

    res.status(201).json({
      success: true,
      jobId,
      message: 'Video generation started',
      estimatedTime: '2-5 minutes'
    });
  } catch (error) {
    logger.error('Generate video error:', error);
    res.status(500).json({
      error: 'Failed to start video generation',
      message: error.message
    });
  }
}

/**
 * GET /api/job/:id
 * Get job status and details
 */
export async function getJobStatus(req, res) {
  try {
    const { id } = req.params;

    const job = await Job.findOne({ jobId: id });

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Get queue job for additional details
    let queueJobState = null;
    try {
      const queueJob = await videoQueue.getJob(id);
      if (queueJob) {
        queueJobState = await queueJob.getState();
      }
    } catch (error) {
      logger.warn('Could not fetch queue job state:', error.message);
    }

    res.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        videoUrl: job.videoUrl,
        thumbnailUrl: job.thumbnailUrl,
        duration: job.duration,
        error: job.error,
        metadata: job.metadata,
        settings: job.settings,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        processingTime: job.processingTime,
        queueState: queueJobState
      }
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({
      error: 'Failed to fetch job status',
      message: error.message
    });
  }
}

/**
 * GET /api/video/:id
 * Get video download URL
 */
export async function getVideoUrl(req, res) {
  try {
    const { id } = req.params;

    const job = await Job.findOne({ jobId: id });

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Video not ready',
        status: job.status,
        progress: job.progress
      });
    }

    // Generate signed URL for private access (optional)
    // const signedUrl = await spacesClient.getSignedUrl(job.videoKey, 3600);

    res.json({
      success: true,
      video: {
        jobId: job.jobId,
        videoUrl: job.videoUrl, // Public URL
        thumbnailUrl: job.thumbnailUrl,
        duration: job.metadata?.duration,
        fileSize: job.metadata?.fileSize,
        resolution: job.metadata?.resolution,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    logger.error('Get video URL error:', error);
    res.status(500).json({
      error: 'Failed to fetch video URL',
      message: error.message
    });
  }
}

/**
 * GET /api/jobs
 * List all jobs (with pagination)
 */
export async function listJobs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = {};
    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .select('jobId status progress currentStep videoUrl thumbnailUrl createdAt completedAt');

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('List jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
}

/**
 * DELETE /api/job/:id
 * Delete a job and its associated video
 */
export async function deleteJob(req, res) {
  try {
    const { id } = req.params;

    const job = await Job.findOne({ jobId: id });

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Delete video from Spaces if it exists
    if (job.videoKey) {
      try {
        await spacesClient.deleteFile(job.videoKey);
        logger.info(`Deleted video from Spaces: ${job.videoKey}`);
      } catch (error) {
        logger.warn('Failed to delete video from Spaces:', error.message);
      }
    }

    // Delete job from database
    await Job.deleteOne({ jobId: id });

    // Remove from queue if still pending
    try {
      const queueJob = await videoQueue.getJob(id);
      if (queueJob) {
        await queueJob.remove();
      }
    } catch (error) {
      logger.warn('Failed to remove job from queue:', error.message);
    }

    logger.info(`Job deleted: ${id}`);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    logger.error('Delete job error:', error);
    res.status(500).json({
      error: 'Failed to delete job',
      message: error.message
    });
  }
}

export default {
  generateVideo,
  getJobStatus,
  getVideoUrl,
  listJobs,
  deleteJob
};
