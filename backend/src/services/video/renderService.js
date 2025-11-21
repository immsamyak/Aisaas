import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import spacesClient from '../../utils/spacesClient.js';
import * as ffmpegCommands from './ffmpegCommands.js';
import { generateSubtitleEntry } from '../ai/textSplitter.js';

/**
 * Main service to render complete video from scenes
 */
class RenderService {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.scenesDir = path.join(this.tempDir, 'scenes');
    this.finalDir = path.join(this.tempDir, 'final');
    this.assetsDir = path.join(process.cwd(), 'assets');
    
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  ensureDirectories() {
    const dirs = [
      this.tempDir,
      this.scenesDir,
      this.finalDir,
      this.assetsDir,
      path.join(this.assetsDir, 'music')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Render complete video from scenes
   * @param {Array} scenes - Array of scene objects with imagePath, audioPath, text, duration
   * @param {Object} options - Rendering options
   * @returns {Promise<Object>} - Video info with URL and metadata
   */
  async renderVideo(scenes, options = {}) {
    const jobId = options.jobId || uuidv4();
    
    try {
      logger.info(`Starting video render for job ${jobId} with ${scenes.length} scenes`);

      // Step 1: Create individual scene videos
      const sceneVideos = await this.createSceneVideos(scenes, jobId);
      
      // Step 2: Concatenate all scene videos
      const concatenatedPath = await this.concatenateScenes(sceneVideos, jobId);
      
      // Step 3: Add subtitles if enabled
      let videoWithSubtitles = concatenatedPath;
      if (options.subtitlesEnabled !== false) {
        videoWithSubtitles = await this.addSubtitlesToVideo(scenes, concatenatedPath, jobId);
      }
      
      // Step 4: Add background music if enabled
      let finalVideo = videoWithSubtitles;
      if (options.musicEnabled !== false) {
        finalVideo = await this.addBackgroundMusicToVideo(videoWithSubtitles, jobId);
      }
      
      // Step 5: Optimize final video
      const optimizedPath = path.join(this.finalDir, `${jobId}_optimized.mp4`);
      await ffmpegCommands.optimizeVideo(finalVideo, optimizedPath);
      
      // Step 6: Create thumbnail
      const thumbnailPath = path.join(this.finalDir, `${jobId}_thumb.jpg`);
      await ffmpegCommands.createThumbnail(optimizedPath, thumbnailPath, 1);
      
      // Step 7: Get video metadata
      const metadata = await ffmpegCommands.getVideoMetadata(optimizedPath);
      
      // Step 8: Upload to DigitalOcean Spaces
      const videoKey = `videos/${jobId}/${jobId}_final.mp4`;
      const thumbnailKey = `videos/${jobId}/${jobId}_thumb.jpg`;
      
      const videoUrl = await spacesClient.uploadFile(optimizedPath, videoKey);
      const thumbnailUrl = await spacesClient.uploadFile(thumbnailPath, thumbnailKey);
      
      // Step 9: Cleanup temp files
      await this.cleanup(jobId);
      
      logger.info(`Video render completed for job ${jobId}`);
      
      return {
        videoUrl,
        videoKey,
        thumbnailUrl,
        metadata: {
          duration: metadata.duration,
          fileSize: metadata.fileSize,
          resolution: `${metadata.width}x${metadata.height}`,
          totalScenes: scenes.length
        }
      };
    } catch (error) {
      logger.error(`Video render failed for job ${jobId}:`, error);
      
      // Cleanup on failure
      await this.cleanup(jobId);
      
      throw new Error(`Video rendering failed: ${error.message}`);
    }
  }

  /**
   * Create video for each scene
   * @param {Array} scenes - Scene objects
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} - Array of scene video paths
   */
  async createSceneVideos(scenes, jobId) {
    logger.info(`Creating ${scenes.length} scene videos`);
    
    const sceneVideos = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const outputPath = path.join(this.scenesDir, `${jobId}_scene_${i}.mp4`);
      
      try {
        await ffmpegCommands.createSceneVideo(
          scene.imagePath,
          scene.audioPath,
          outputPath
        );
        
        sceneVideos.push(outputPath);
        logger.info(`Scene ${i + 1}/${scenes.length} video created`);
      } catch (error) {
        logger.error(`Failed to create scene ${i} video:`, error);
        throw error;
      }
    }
    
    return sceneVideos;
  }

  /**
   * Concatenate scene videos
   * @param {Array} sceneVideos - Array of scene video paths
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} - Path to concatenated video
   */
  async concatenateScenes(sceneVideos, jobId) {
    logger.info('Concatenating scene videos');
    
    const outputPath = path.join(this.finalDir, `${jobId}_concat.mp4`);
    const listPath = path.join(this.finalDir, `${jobId}_list.txt`);
    
    await ffmpegCommands.concatenateVideos(sceneVideos, outputPath, listPath);
    
    // Clean up list file
    if (fs.existsSync(listPath)) {
      fs.unlinkSync(listPath);
    }
    
    return outputPath;
  }

  /**
   * Add subtitles to video
   * @param {Array} scenes - Scene objects with text and duration
   * @param {string} videoPath - Input video path
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} - Path to video with subtitles
   */
  async addSubtitlesToVideo(scenes, videoPath, jobId) {
    logger.info('Adding subtitles to video');
    
    // Generate SRT file
    const srtPath = path.join(this.finalDir, `${jobId}_subtitles.srt`);
    let srtContent = '';
    let currentTime = 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const duration = scene.duration || 3.0;
      
      srtContent += generateSubtitleEntry(scene.text, i, currentTime, duration);
      srtContent += '\n';
      
      currentTime += duration;
    }
    
    fs.writeFileSync(srtPath, srtContent);
    
    const outputPath = path.join(this.finalDir, `${jobId}_subtitled.mp4`);
    await ffmpegCommands.addSubtitles(videoPath, srtPath, outputPath);
    
    // Clean up SRT file
    if (fs.existsSync(srtPath)) {
      fs.unlinkSync(srtPath);
    }
    
    return outputPath;
  }

  /**
   * Add background music to video
   * @param {string} videoPath - Input video path
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} - Path to video with music
   */
  async addBackgroundMusicToVideo(videoPath, jobId) {
    logger.info('Adding background music to video');
    
    // Get background music file
    const musicDir = path.join(this.assetsDir, 'music');
    const musicFiles = fs.existsSync(musicDir) 
      ? fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'))
      : [];
    
    if (musicFiles.length === 0) {
      logger.warn('No background music found, skipping');
      return videoPath;
    }
    
    // Select random music file
    const musicFile = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    const musicPath = path.join(musicDir, musicFile);
    
    const outputPath = path.join(this.finalDir, `${jobId}_with_music.mp4`);
    await ffmpegCommands.addBackgroundMusic(videoPath, musicPath, outputPath, 0.3);
    
    return outputPath;
  }

  /**
   * Cleanup temporary files for a job
   * @param {string} jobId - Job ID
   */
  async cleanup(jobId) {
    try {
      logger.info(`Cleaning up temp files for job ${jobId}`);
      
      const patterns = [
        path.join(this.scenesDir, `${jobId}_*`),
        path.join(this.finalDir, `${jobId}_*`)
      ];
      
      for (const pattern of patterns) {
        const dir = path.dirname(pattern);
        const prefix = path.basename(pattern).replace('*', '');
        
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            if (file.startsWith(prefix.replace('_*', ''))) {
              const filePath = path.join(dir, file);
              try {
                fs.unlinkSync(filePath);
                logger.debug(`Deleted: ${filePath}`);
              } catch (error) {
                logger.warn(`Failed to delete ${filePath}:`, error.message);
              }
            }
          });
        }
      }
      
      logger.info(`Cleanup completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Cleanup failed for job ${jobId}:`, error);
    }
  }
}

export default new RenderService();
