#!/bin/bash

# Install Automatic1111 WebUI with CPU support for testing
# WARNING: This will be VERY SLOW without a GPU

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "================================================"
echo "Installing Automatic1111 WebUI (CPU Mode)"
echo "================================================"
echo ""
echo -e "${RED}WARNING: Without GPU, image generation will take 2-5 minutes per image!${NC}"
echo -e "${YELLOW}This is only suitable for testing, not production use.${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
sudo apt-get update
sudo apt-get install -y wget git python3 python3-venv python3-pip libgl1 libglib2.0-0

# Create installation directory
INSTALL_DIR="/home/aisaas/stable-diffusion-webui"
cd /home/aisaas

# Clone Automatic1111 repository
if [ -d "$INSTALL_DIR" ]; then
    echo "Stable Diffusion WebUI already exists, updating..."
    cd $INSTALL_DIR
    git pull
else
    echo "Cloning Stable Diffusion WebUI..."
    git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
    cd $INSTALL_DIR
fi

# Download Stable Diffusion v1.5 model (smaller, faster on CPU)
echo ""
echo "Downloading Stable Diffusion v1.5 model (~4GB)..."
mkdir -p models/Stable-diffusion
cd models/Stable-diffusion

if [ ! -f "v1-5-pruned-emaonly.safetensors" ]; then
    wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
    echo -e "${GREEN}✅ Model downloaded${NC}"
else
    echo "Model already exists, skipping download"
fi

cd $INSTALL_DIR

# Create launch script for CPU mode
cat > launch-cpu.sh << 'EOF'
#!/bin/bash
export COMMANDLINE_ARGS="--skip-torch-cuda-test --precision full --no-half --api --listen --port 7860"
./webui.sh
EOF

chmod +x launch-cpu.sh

# Start Automatic1111 with PM2
echo ""
echo "Starting Automatic1111 WebUI..."
cd /home/aisaas
pm2 start stable-diffusion-webui/launch-cpu.sh --name "stable-diffusion" --interpreter bash

echo ""
echo -e "${GREEN}✅ Automatic1111 WebUI installed!${NC}"
echo ""
echo "API URL: http://localhost:7860"
echo ""
echo "Commands:"
echo "  View logs:    pm2 logs stable-diffusion"
echo "  Stop:         pm2 stop stable-diffusion"
echo "  Restart:      pm2 restart stable-diffusion"
echo ""
echo -e "${YELLOW}Note: First startup will take 5-10 minutes to install Python dependencies${NC}"
echo -e "${YELLOW}Image generation on CPU will be VERY SLOW (2-5 minutes per image)${NC}"
echo ""

# Update backend environment with A1111 URL
echo "Updating backend environment..."
cd /home/aisaas/Aisaas/backend
if grep -q "A1111_URL" .env 2>/dev/null; then
    sed -i 's|A1111_URL=.*|A1111_URL=http://localhost:7860|' .env
else
    echo "A1111_URL=http://localhost:7860" >> .env
fi

echo -e "${GREEN}✅ Backend environment updated${NC}"
echo ""
echo "Waiting for API to be ready (this may take 10 minutes on first run)..."
echo "Check status with: pm2 logs stable-diffusion"
