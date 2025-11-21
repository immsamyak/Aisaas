import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

/**
 * Generate a quick placeholder image with gradient and text
 * @param {string} text - Scene text to display
 * @param {string} outputPath - Path to save image
 * @returns {Promise<string>} - Path to generated image
 */
export async function generateQuickImage(text, outputPath) {
  const width = 1080;
  const height = 1920;
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const colors = [
    ['#667eea', '#764ba2'], // Purple
    ['#f093fb', '#f5576c'], // Pink
    ['#4facfe', '#00f2fe'], // Blue
    ['#43e97b', '#38f9d7'], // Green
    ['#fa709a', '#fee140'], // Orange
  ];
  
  const colorPair = colors[Math.floor(Math.random() * colors.length)];
  gradient.addColorStop(0, colorPair[0]);
  gradient.addColorStop(1, colorPair[1]);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Word wrap text
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > width - 100) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine);
  
  // Draw text lines
  const lineHeight = 80;
  const startY = (height - (lines.length * lineHeight)) / 2;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + (i * lineHeight));
  });
  
  // Save to file
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  return outputPath;
}
