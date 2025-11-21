import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Create video from image and audio for a single scene
 * @param {string} imagePath - Path to scene image
 * @param {string} audioPath - Path to scene audio
 * @param {string} outputPath - Path to save video
 * @returns {Promise<string>} - Path to created video
 */
export async function createSceneVideo(imagePath, audioPath, outputPath) {
  try {
    logger.info(`Creating scene video: ${outputPath}`);
    
    const command = `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "${outputPath}" -y`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10 
    });
    
    if (stderr && !stderr.includes('frame=')) {
      logger.debug('FFmpeg stderr:', stderr);
    }
    
    logger.info(`Scene video created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error creating scene video:', error);
    throw new Error(`Scene video creation failed: ${error.message}`);
  }
}

/**
 * Concatenate multiple videos into one
 * @param {Array<string>} videoPaths - Array of video file paths
 * @param {string} outputPath - Path to save concatenated video
 * @param {string} listFilePath - Path to save concat list file
 * @returns {Promise<string>} - Path to concatenated video
 */
export async function concatenateVideos(videoPaths, outputPath, listFilePath) {
  try {
    logger.info(`Concatenating ${videoPaths.length} videos`);
    
    // Create concat list file
    const listContent = videoPaths
      .map(path => `file '${path.replace(/\\/g, '/')}'`)
      .join('\n');
    
    const fs = await import('fs');
    fs.writeFileSync(listFilePath, listContent);
    
    // Concatenate using concat demuxer
    const command = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}" -y`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10 
    });
    
    logger.info(`Videos concatenated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error concatenating videos:', error);
    throw new Error(`Video concatenation failed: ${error.message}`);
  }
}

/**
 * Add subtitles to video
 * @param {string} videoPath - Input video path
 * @param {string} subtitlePath - SRT subtitle file path
 * @param {string} outputPath - Output video path
 * @returns {Promise<string>} - Path to video with subtitles
 */
export async function addSubtitles(videoPath, subtitlePath, outputPath) {
  try {
    logger.info('Adding subtitles to video');
    
    // Subtitle style: white text, black outline, bottom position
    const subtitleStyle = "FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,MarginV=50,Alignment=2";
    
    const command = `ffmpeg -i "${videoPath}" -vf "subtitles='${subtitlePath}':force_style='${subtitleStyle}'" -c:a copy "${outputPath}" -y`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10 
    });
    
    logger.info(`Subtitles added: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error adding subtitles:', error);
    // If subtitle addition fails, just copy the original video
    logger.warn('Subtitle addition failed, using video without subtitles');
    const fs = await import('fs');
    fs.copyFileSync(videoPath, outputPath);
    return outputPath;
  }
}

/**
 * Add background music to video
 * @param {string} videoPath - Input video path
 * @param {string} musicPath - Background music path
 * @param {string} outputPath - Output video path
 * @param {number} volume - Music volume (0.0 to 1.0)
 * @returns {Promise<string>} - Path to video with music
 */
export async function addBackgroundMusic(videoPath, musicPath, outputPath, volume = 0.3) {
  try {
    logger.info('Adding background music to video');
    
    // Mix video audio with background music, fade out music at the end
    const command = `ffmpeg -i "${videoPath}" -stream_loop -1 -i "${musicPath}" -filter_complex "[1:a]volume=${volume},afade=t=out:st=5:d=2[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k "${outputPath}" -y`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10 
    });
    
    logger.info(`Background music added: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error adding background music:', error);
    // If music addition fails, just copy the original video
    logger.warn('Background music addition failed, using video without music');
    const fs = await import('fs');
    fs.copyFileSync(videoPath, outputPath);
    return outputPath;
  }
}

/**
 * Get video metadata (duration, resolution, etc.)
 * @param {string} videoPath - Video file path
 * @returns {Promise<object>} - Video metadata
 */
export async function getVideoMetadata(videoPath) {
  try {
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration,size -of json "${videoPath}"`;
    
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    
    const stream = data.streams?.[0] || {};
    const format = data.format || {};
    
    return {
      width: stream.width || 1080,
      height: stream.height || 1920,
      duration: parseFloat(format.duration || stream.duration || 0),
      fileSize: parseInt(format.size || 0)
    };
  } catch (error) {
    logger.error('Error getting video metadata:', error);
    return {
      width: 1080,
      height: 1920,
      duration: 0,
      fileSize: 0
    };
  }
}

/**
 * Create thumbnail from video
 * @param {string} videoPath - Video file path
 * @param {string} outputPath - Thumbnail output path
 * @param {number} timestamp - Timestamp to capture (seconds)
 * @returns {Promise<string>} - Path to thumbnail
 */
export async function createThumbnail(videoPath, outputPath, timestamp = 1) {
  try {
    logger.info('Creating video thumbnail');
    
    const command = `ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -vf "scale=540:960" "${outputPath}" -y`;
    
    await execAsync(command);
    
    logger.info(`Thumbnail created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error creating thumbnail:', error);
    throw new Error(`Thumbnail creation failed: ${error.message}`);
  }
}

/**
 * Optimize video for web delivery
 * @param {string} inputPath - Input video path
 * @param {string} outputPath - Output video path
 * @returns {Promise<string>} - Path to optimized video
 */
export async function optimizeVideo(inputPath, outputPath) {
  try {
    logger.info('Optimizing video for web');
    
    // Re-encode with optimal settings for web
    const command = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}" -y`;
    
    await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10 
    });
    
    logger.info(`Video optimized: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error optimizing video:', error);
    // If optimization fails, just copy the original
    const fs = await import('fs');
    fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }
}

export default {
  createSceneVideo,
  concatenateVideos,
  addSubtitles,
  addBackgroundMusic,
  getVideoMetadata,
  createThumbnail,
  optimizeVideo
};
