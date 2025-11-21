import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Generate TTS audio using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID
 * @param {string} outputPath - Path to save audio
 * @returns {Promise<string>} - Path to generated audio
 */
async function generateWithElevenLabs(text, voiceId, outputPath) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  const payload = {
    text: text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  try {
    logger.info(`Generating TTS with ElevenLabs: ${text.substring(0, 50)}...`);
    
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });

    // Save MP3 file
    const mp3Path = outputPath.replace('.wav', '.mp3');
    fs.writeFileSync(mp3Path, response.data);
    
    // Convert MP3 to WAV using FFmpeg
    await execAsync(`ffmpeg -i "${mp3Path}" -ar 44100 -ac 2 "${outputPath}" -y`);
    
    // Delete temporary MP3
    fs.unlinkSync(mp3Path);
    
    logger.info(`TTS audio saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('ElevenLabs TTS error:', error.message);
    throw new Error(`ElevenLabs TTS generation failed: ${error.message}`);
  }
}

/**
 * Generate TTS audio using Bark (local inference)
 * @param {string} text - Text to convert to speech
 * @param {string} voicePreset - Voice preset
 * @param {string} outputPath - Path to save audio
 * @returns {Promise<string>} - Path to generated audio
 */
async function generateWithBark(text, voicePreset, outputPath) {
  // Bark Python script path
  const barkScript = path.join(process.cwd(), 'scripts', 'bark_tts.py');
  
  // Check if Bark is available
  if (!fs.existsSync(barkScript)) {
    logger.warn('Bark script not found, creating basic script');
    await createBarkScript(barkScript);
  }

  try {
    logger.info(`Generating TTS with Bark: ${text.substring(0, 50)}...`);
    
    // Call Python script
    const command = `python "${barkScript}" --text "${text.replace(/"/g, '\\"')}" --output "${outputPath}" --voice "${voicePreset}"`;
    
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
    
    if (stderr) {
      logger.warn('Bark stderr:', stderr);
    }
    
    logger.info(`Bark TTS audio saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Bark TTS error:', error.message);
    throw new Error(`Bark TTS generation failed: ${error.message}`);
  }
}

/**
 * Create Bark TTS Python script
 * @param {string} scriptPath - Path to save script
 */
async function createBarkScript(scriptPath) {
  const scriptDir = path.dirname(scriptPath);
  if (!fs.existsSync(scriptDir)) {
    fs.mkdirSync(scriptDir, { recursive: true });
  }

  const script = `#!/usr/bin/env python3
"""
Bark TTS Generator Script
Requires: pip install git+https://github.com/suno-ai/bark.git
"""
import argparse
import numpy as np
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

# Preload models
preload_models()

def generate_speech(text, output_path, voice_preset="v2/en_speaker_6"):
    """Generate speech from text using Bark"""
    try:
        # Generate audio
        audio_array = generate_audio(text, history_prompt=voice_preset)
        
        # Save as WAV
        write_wav(output_path, SAMPLE_RATE, audio_array)
        print(f"Audio saved to {output_path}")
        return output_path
    except Exception as e:
        print(f"Error generating audio: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Text to convert to speech")
    parser.add_argument("--output", required=True, help="Output WAV file path")
    parser.add_argument("--voice", default="v2/en_speaker_6", help="Voice preset")
    
    args = parser.parse_args()
    generate_speech(args.text, args.output, args.voice)
`;

  fs.writeFileSync(scriptPath, script);
  logger.info(`Created Bark script at ${scriptPath}`);
}

/**
 * Get audio duration in seconds
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    
    return parseFloat(stdout.trim());
  } catch (error) {
    logger.error('Error getting audio duration:', error);
    return 3.0; // Default duration
  }
}

/**
 * Main function to generate TTS audio for a scene
 * @param {string} sceneText - Scene text
 * @param {number} sceneIndex - Scene index
 * @param {string} voiceId - Voice ID or preset
 * @returns {Promise<{audioPath: string, duration: number}>} - Audio info
 */
export async function generateSceneAudio(sceneText, sceneIndex, voiceId = 'default') {
  const outputDir = path.join(process.cwd(), 'temp', 'audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `scene_${sceneIndex}.wav`);
  
  // Choose TTS engine based on environment variable
  const ttsEngine = process.env.TTS_ENGINE || 'elevenlabs';
  
  try {
    let audioPath;
    
    if (ttsEngine === 'bark') {
      audioPath = await generateWithBark(sceneText, voiceId, outputPath);
    } else if (ttsEngine === 'elevenlabs') {
      // Default ElevenLabs voice IDs
      const elevenLabsVoices = {
        'default': '21m00Tcm4TlvDq8ikWAM',
        'male': 'ErXwobaYiN019PkySvjV',
        'female': '21m00Tcm4TlvDq8ikWAM',
        'british': 'pNInz6obpgDQGcFmaJgB'
      };
      
      const actualVoiceId = elevenLabsVoices[voiceId] || elevenLabsVoices.default;
      audioPath = await generateWithElevenLabs(sceneText, actualVoiceId, outputPath);
    } else {
      throw new Error(`Unknown TTS engine: ${ttsEngine}`);
    }

    // Get audio duration
    const duration = await getAudioDuration(audioPath);
    
    return {
      audioPath,
      duration: Math.max(duration, 2.0) // Minimum 2 seconds
    };
  } catch (error) {
    logger.error(`TTS generation failed for scene ${sceneIndex}:`, error);
    
    // Create silent audio as fallback
    const fallbackPath = await createSilentAudio(outputPath, 3.0);
    return {
      audioPath: fallbackPath,
      duration: 3.0
    };
  }
}

/**
 * Create silent audio file as fallback
 * @param {string} outputPath - Output path
 * @param {number} duration - Duration in seconds
 * @returns {Promise<string>} - Path to silent audio
 */
async function createSilentAudio(outputPath, duration) {
  try {
    await execAsync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} "${outputPath}" -y`
    );
    
    logger.info(`Created silent audio fallback: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error creating silent audio:', error);
    throw error;
  }
}

export default {
  generateSceneAudio,
  getAudioDuration
};
