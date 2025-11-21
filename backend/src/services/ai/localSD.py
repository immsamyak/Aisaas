#!/usr/bin/env python3
"""
Local Stable Diffusion image generation using CPU
"""
import sys
import torch
from diffusers import StableDiffusionPipeline
import os

def generate_image(prompt, output_path, style="realistic"):
    """Generate image using Stable Diffusion on CPU"""
    try:
        # Use CPU and lower precision for faster inference
        model_id = "runwayml/stable-diffusion-v1-5"
        
        print(f"Loading Stable Diffusion model: {model_id}", file=sys.stderr)
        
        # Load pipeline with CPU optimizations
        pipe = StableDiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Use CPU
        pipe = pipe.to("cpu")
        
        # Enable memory optimizations
        pipe.enable_attention_slicing()
        
        print(f"Generating image for prompt: {prompt[:50]}...", file=sys.stderr)
        
        # Generate image
        image = pipe(
            prompt=prompt,
            negative_prompt="blurry, bad quality, distorted, ugly, watermark, text, signature",
            num_inference_steps=20,  # Reduced for faster generation
            guidance_scale=7.5,
            width=512,  # Smaller size for CPU
            height=912,  # Portrait aspect ratio
        ).images[0]
        
        # Resize to target resolution
        image = image.resize((1080, 1920))
        
        # Save image
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path)
        
        print(f"Image saved to: {output_path}", file=sys.stderr)
        print(output_path)  # Output path to stdout
        return 0
        
    except Exception as e:
        print(f"Error generating image: {str(e)}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python localSD.py <prompt> <output_path> [style]", file=sys.stderr)
        sys.exit(1)
    
    prompt = sys.argv[1]
    output_path = sys.argv[2]
    style = sys.argv[3] if len(sys.argv) > 3 else "realistic"
    
    sys.exit(generate_image(prompt, output_path, style))
