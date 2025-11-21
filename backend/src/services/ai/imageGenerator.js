import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';
import { fileURLToPath } from 'url';
import { generateQuickImage } from './quickImage.js';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate image using Hugging Face Inference API (FREE)
 * @param {string} prompt - Image generation prompt
 * @param {string} outputPath - Path to save image
 * @returns {Promise<string>} - Path to generated image
 */
async function generateWithHuggingFace(prompt, outputPath) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not found in environment variables');
  }

  try {
    logger.info(`Generating image with Hugging Face: ${prompt.substring(0, 50)}...`);
    
    // Using Stable Diffusion XL model (free tier)
    const modelUrl = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
    
    const response = await axios.post(
      modelUrl,
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout
      }
    );

    // Check if model is loading
    if (response.headers['content-type']?.includes('application/json')) {
      const jsonResponse = JSON.parse(response.data.toString());
      if (jsonResponse.error && jsonResponse.error.includes('loading')) {
        logger.info('Model is loading, retrying in 20 seconds...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        return await generateWithHuggingFace(prompt, outputPath);
      }
      throw new Error(jsonResponse.error || 'Unknown error from Hugging Face');
    }

    // Save image
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response.data);
    
    // Verify file
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error('Generated image is invalid or too small');
    }
    
    logger.info(`Image saved to ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('Hugging Face generation error:', error.message);
    logger.error('Full error:', error.response?.data || error);
    console.error('========================================');
    console.error('HUGGING FACE API ERROR:');
    console.error('Error message:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
    console.error('========================================');
    throw new Error(`Hugging Face image generation failed: ${error.message}`);
  }
}

/**
 * Generate image using local Stable Diffusion (Python)
 * @param {string} prompt - Image generation prompt
 * @param {string} outputPath - Path to save image
 * @returns {Promise<string>} - Path to generated image
 */
async function generateWithLocalSD(prompt, outputPath) {
  try {
    logger.info(`Generating image with Local SD: ${prompt.substring(0, 50)}...`);
    
    const pythonScript = path.join(__dirname, 'localSD.py');
    const venvPython = path.join(__dirname, 'sd_env', 'bin', 'python3');
    
    // Check if venv exists, otherwise use system python3
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';
    
    // Escape quotes in prompt
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    
    const command = `${pythonCmd} "${pythonScript}" "${escapedPrompt}" "${outputPath}"`;
    
    logger.info('Executing: ' + command);
    
    const { stdout, stderr } = await execPromise(command, {
      timeout: 600000, // 10 minutes timeout (for model download on first run)
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    if (stderr) {
      logger.info('SD stderr: ' + stderr);
    }
    
    if (stdout) {
      logger.info('SD stdout: ' + stdout);
    }
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Image file was not created');
    }
    
    logger.info(`Image saved to ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    logger.error('Local SD generation error:', error.message);
    throw new Error(`Local SD image generation failed: ${error.message}`);
  }
}

/**
 * Generate image using Automatic1111 API
 * @param {string} prompt - Image generation prompt
 * @param {string} outputPath - Path to save image
 * @returns {Promise<string>} - Path to generated image
 */
async function generateWithA1111(prompt, outputPath) {
  const apiUrl = process.env.A1111_API_URL || 'http://127.0.0.1:7860';
  
  const payload = {
    prompt: prompt,
    negative_prompt: process.env.A1111_NEGATIVE_PROMPT || 
      'blurry, bad quality, distorted, ugly, watermark, text, signature',
    steps: parseInt(process.env.A1111_STEPS) || 25,
    sampler_name: 'DPM++ 2M Karras',
    cfg_scale: 7,
    width: 1080,
    height: 1920,
    seed: -1,
    save_images: false
  };

  try {
    logger.info(`Generating image with A1111: ${prompt.substring(0, 50)}...`);
    
    const response = await axios.post(
      `${apiUrl}/sdapi/v1/txt2img`,
      payload,
      { 
        timeout: 120000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.data.images || response.data.images.length === 0) {
      throw new Error('No images returned from A1111 API');
    }

    // Decode base64 image
    const imageBase64 = response.data.images[0];
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Save to file
    fs.writeFileSync(outputPath, imageBuffer);
    logger.info(`Image saved to ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    logger.error('A1111 generation error:', error.message);
    throw new Error(`A1111 image generation failed: ${error.message}`);
  }
}

/**
 * Generate image using ComfyUI API
 * @param {string} prompt - Image generation prompt
 * @param {string} outputPath - Path to save image
 * @returns {Promise<string>} - Path to generated image
 */
async function generateWithComfyUI(prompt, outputPath) {
  const apiUrl = process.env.COMFYUI_API_URL || 'http://127.0.0.1:8188';
  
  // ComfyUI workflow (simplified)
  const workflow = {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000),
        "steps": 25,
        "cfg": 7,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": 1080,
        "height": 1920,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": prompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": "blurry, bad quality, distorted",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  };

  try {
    logger.info(`Generating image with ComfyUI: ${prompt.substring(0, 50)}...`);
    
    // Queue prompt
    const queueResponse = await axios.post(
      `${apiUrl}/prompt`,
      { prompt: workflow },
      { timeout: 5000 }
    );

    const promptId = queueResponse.data.prompt_id;
    
    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const historyResponse = await axios.get(`${apiUrl}/history/${promptId}`);
      const history = historyResponse.data[promptId];
      
      if (history && history.status?.completed) {
        completed = true;
        
        // Get output image
        const outputs = history.outputs;
        const imageNode = outputs['9']; // SaveImage node
        
        if (imageNode && imageNode.images && imageNode.images.length > 0) {
          const imageInfo = imageNode.images[0];
          const imageUrl = `${apiUrl}/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder}&type=${imageInfo.type}`;
          
          // Download image
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(outputPath, imageResponse.data);
          
          logger.info(`Image saved to ${outputPath}`);
          return outputPath;
        }
      }
      
      attempts++;
    }
    
    throw new Error('ComfyUI generation timeout');
  } catch (error) {
    logger.error('ComfyUI generation error:', error.message);
    throw new Error(`ComfyUI image generation failed: ${error.message}`);
  }
}

/**
 * Build enhanced prompt for image generation
 * @param {string} sceneText - Scene text
 * @param {string} style - Image style (realistic, anime, cinematic, etc.)
 * @returns {string} - Enhanced prompt
 */
function buildPrompt(sceneText, style = 'realistic') {
  const stylePrompts = {
    realistic: 'photorealistic, highly detailed, 8k, professional photography',
    cinematic: 'cinematic lighting, movie scene, dramatic, epic',
    anime: 'anime style, studio ghibli, vibrant colors, detailed',
    digital_art: 'digital art, concept art, trending on artstation',
    oil_painting: 'oil painting, artistic, brushstrokes, classical art',
    cartoon: '3d cartoon, pixar style, vibrant, cute'
  };

  const baseStyle = stylePrompts[style] || stylePrompts.realistic;
  
  // Extract key visual elements from scene text
  const enhancedPrompt = `${sceneText}, ${baseStyle}, high quality, masterpiece, vertical format, portrait orientation`;
  
  return enhancedPrompt;
}

/**
 * Main function to generate image for a scene
 * @param {string} sceneText - Scene text
 * @param {number} sceneIndex - Scene index
 * @param {string} style - Image style
 * @returns {Promise<string>} - Path to generated image
 */
export async function generateSceneImage(sceneText, sceneIndex, style = 'realistic') {
  const outputDir = path.join(process.cwd(), 'temp', 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `scene_${sceneIndex}.png`);
  
  // Build enhanced prompt
  const prompt = buildPrompt(sceneText, style);
  
  // Choose API based on environment variable
  const apiType = process.env.IMAGE_API_TYPE || 'huggingface';
  
  try {
    if (apiType === 'huggingface' || apiType === 'hf') {
      // Use free Hugging Face API (default)
      return await generateWithHuggingFace(prompt, outputPath);
    } else if (apiType === 'comfyui') {
      return await generateWithComfyUI(prompt, outputPath);
    } else if (apiType === 'a1111') {
      return await generateWithA1111(prompt, outputPath);
    } else if (apiType === 'local') {
      return await generateWithLocalSD(prompt, outputPath);
    } else if (apiType === 'quick') {
      // Quick placeholder (for testing)
      logger.info(`Generating quick image for: ${sceneText}`);
      return await generateQuickImage(sceneText, outputPath);
    } else {
      // Default to Hugging Face
      return await generateWithHuggingFace(prompt, outputPath);
    }
  } catch (error) {
    logger.error(`Image generation failed for scene ${sceneIndex}:`, error);
    
    // Fallback to quick placeholder image if API fails
    logger.warn('Falling back to placeholder image');
    try {
      const placeholderPath = await generateQuickImage(sceneText, outputPath);
      return placeholderPath;
    } catch (placeholderError) {
      logger.error('Placeholder generation also failed:', placeholderError);
      throw error;
    }
  }
}

/**
 * Create a placeholder image when generation fails
 * @param {string} outputPath - Output path
 * @param {string} text - Scene text
 * @returns {Promise<string>} - Path to placeholder
 */
async function createPlaceholderImage(outputPath, text) {
  // Create a simple colored placeholder (1080x1920)
  // In production, you'd use a library like canvas or sharp
  logger.warn('Using placeholder image due to generation failure');
  
  // For now, just copy a default placeholder if it exists
  const placeholderSource = path.join(process.cwd(), 'assets', 'placeholder.png');
  
  if (fs.existsSync(placeholderSource)) {
    fs.copyFileSync(placeholderSource, outputPath);
  } else {
    // Create a minimal PNG (just copy previous scene or use a default color)
    logger.warn('No placeholder available, using empty file');
    fs.writeFileSync(outputPath, Buffer.alloc(0));
  }
  
  return outputPath;
}

export default {
  generateSceneImage,
  buildPrompt
};
