#!/bin/bash

# AI Shorts Video Generator - Quick Start Script for Ubuntu 22.04

set -e

echo "================================================"
echo "AI Shorts Video Generator - Installation Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "Please do not run this script as root"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
echo "📦 Installing Redis..."
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install MongoDB
echo "📦 Installing MongoDB..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# Install FFmpeg
echo "📦 Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Python for Bark (optional)
echo "📦 Installing Python dependencies..."
sudo apt install -y python3-pip python3-venv

# Create project directories
echo "📁 Creating project directories..."
mkdir -p ~/ai-shorts-generator
cd ~/ai-shorts-generator

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Clone your project: git clone <repo-url> ~/ai-shorts-generator"
echo "2. Copy .env.example to .env and configure"
echo "3. Run: cd backend && npm install"
echo "4. Run: cd worker && npm install"
echo "5. Run: cd frontend && npm install && npm run build"
echo "6. Start services: pm2 start ecosystem.config.js"
echo ""
echo "For full deployment guide, see DEPLOYMENT.md"
