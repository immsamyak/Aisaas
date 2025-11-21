import logger from '../../utils/logger.js';

/**
 * Split input text into scenes of 10-18 words each
 * @param {string} text - Input text to split
 * @returns {Array<string>} - Array of scene texts
 */
export function splitTextIntoScenes(text) {
  // Clean and normalize text
  const cleanText = text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["""]/g, '"')
    .replace(/[''']/g, "'");

  // Split by sentences first
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
  
  const scenes = [];
  let currentScene = '';
  let wordCount = 0;

  for (let sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    
    // If adding this sentence exceeds 18 words, start new scene
    if (wordCount > 0 && wordCount + words.length > 18) {
      scenes.push(currentScene.trim());
      currentScene = sentence;
      wordCount = words.length;
    } else {
      currentScene += (currentScene ? ' ' : '') + sentence;
      wordCount += words.length;
    }

    // If current scene reaches minimum length (10 words), consider it complete
    if (wordCount >= 10 && wordCount <= 18) {
      // Check if there are more sentences
      const remaining = sentences.indexOf(sentence) < sentences.length - 1;
      if (!remaining) {
        // Last sentence, add to scenes
        scenes.push(currentScene.trim());
        currentScene = '';
        wordCount = 0;
      }
    }
  }

  // Add any remaining text as final scene
  if (currentScene.trim()) {
    scenes.push(currentScene.trim());
  }

  // If no scenes were created (very short text), create at least one
  if (scenes.length === 0) {
    scenes.push(cleanText);
  }

  // Validate and adjust scenes
  const validatedScenes = [];
  for (let scene of scenes) {
    const words = scene.split(/\s+/);
    
    if (words.length > 18) {
      // Split long scenes into chunks
      let chunk = '';
      let chunkWordCount = 0;
      
      for (let word of words) {
        if (chunkWordCount >= 15) {
          validatedScenes.push(chunk.trim());
          chunk = word;
          chunkWordCount = 1;
        } else {
          chunk += (chunk ? ' ' : '') + word;
          chunkWordCount++;
        }
      }
      
      if (chunk) {
        validatedScenes.push(chunk.trim());
      }
    } else if (words.length < 5 && validatedScenes.length > 0) {
      // Merge very short scenes with previous
      validatedScenes[validatedScenes.length - 1] += ' ' + scene;
    } else {
      validatedScenes.push(scene);
    }
  }

  logger.info(`Split text into ${validatedScenes.length} scenes`);
  validatedScenes.forEach((scene, idx) => {
    const wordCount = scene.split(/\s+/).length;
    logger.debug(`Scene ${idx + 1}: ${wordCount} words - "${scene.substring(0, 50)}..."`);
  });

  return validatedScenes;
}

/**
 * Generate subtitle text for a scene
 * @param {string} sceneText - Scene text
 * @param {number} sceneIndex - Scene index (0-based)
 * @param {number} startTime - Start time in seconds
 * @param {number} duration - Duration in seconds
 * @returns {string} - SRT format subtitle entry
 */
export function generateSubtitleEntry(sceneText, sceneIndex, startTime, duration) {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  const start = formatTime(startTime);
  const end = formatTime(startTime + duration);

  return `${sceneIndex + 1}\n${start} --> ${end}\n${sceneText}\n`;
}

export default {
  splitTextIntoScenes,
  generateSubtitleEntry
};
