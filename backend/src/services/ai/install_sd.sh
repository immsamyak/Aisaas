#!/bin/bash
# Install Stable Diffusion dependencies

echo "Installing Stable Diffusion dependencies..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Installing..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
fi

# Create virtual environment
cd ~/Aisaas/backend/src/services/ai
python3 -m venv sd_env

# Activate virtual environment
source sd_env/bin/activate

# Install PyTorch CPU version
echo "Installing PyTorch (CPU)..."
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install diffusers and dependencies
echo "Installing diffusers..."
pip install diffusers transformers accelerate safetensors pillow

# Make Python script executable
chmod +x localSD.py

echo "Installation complete!"
echo "The first time you run it, it will download the model (~4GB)"
