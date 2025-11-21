#!/bin/bash

################################################################################
# AI Shorts Video Generator - Complete Auto-Deployment Script
# Ubuntu 22.04 LTS
# GitHub: https://github.com/immsamyak/Aisaas.git
#
# This script will:
# 1. Install all system dependencies (Node.js, MongoDB, Redis, FFmpeg, Nginx)
# 2. Clone the project from GitHub
# 3. Configure MongoDB with authentication
# 4. Setup Redis with password
# 5. Install all project dependencies
# 6. Configure environment variables
# 7. Build frontend
# 8. Setup Nginx reverse proxy
# 9. Configure firewall
# 10. Start all services with PM2
# 11. Setup auto-start on boot
#
# Usage: chmod +x install.sh && ./install.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/immsamyak/Aisaas.git"
PROJECT_DIR="$HOME/ai-shorts-generator"
MONGODB_USER="ai_shorts_admin"
MONGODB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
DOMAIN=""  # Will be prompted
NODE_ENV="production"

# Logging
LOG_FILE="$HOME/ai-shorts-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root!"
        print_info "Run as normal user: ./install.sh"
        exit 1
    fi
}

check_ubuntu() {
    if [ ! -f /etc/os-release ]; then
        print_error "Cannot detect OS version"
        exit 1
    fi
    
    . /etc/os-release
    if [ "$ID" != "ubuntu" ]; then
        print_error "This script is designed for Ubuntu 22.04"
        exit 1
    fi
    
    print_success "Detected Ubuntu $VERSION"
}

prompt_domain() {
    echo ""
    read -p "Enter your domain name (or press Enter for localhost): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        DOMAIN="localhost"
        print_warning "Using localhost (no SSL will be configured)"
    else
        print_info "Domain set to: $DOMAIN"
    fi
}

prompt_api_keys() {
    echo ""
    print_header "API Configuration"
    
    echo "You'll need API keys for AI services:"
    echo "1. ElevenLabs API Key (for TTS) - Get from: https://elevenlabs.io/"
    echo "2. Automatic1111 API URL (for images) - Usually http://127.0.0.1:7860"
    echo "3. DigitalOcean Spaces credentials - Get from: https://cloud.digitalocean.com/spaces"
    echo ""
    
    read -p "Enter ElevenLabs API Key (or press Enter to skip): " ELEVENLABS_KEY
    read -p "Enter A1111 API URL [http://127.0.0.1:7860]: " A1111_URL
    A1111_URL=${A1111_URL:-http://127.0.0.1:7860}
    
    read -p "Enter DigitalOcean Spaces Endpoint [https://nyc3.digitaloceanspaces.com]: " SPACES_ENDPOINT
    SPACES_ENDPOINT=${SPACES_ENDPOINT:-https://nyc3.digitaloceanspaces.com}
    
    read -p "Enter Spaces Bucket Name: " SPACES_BUCKET
    read -p "Enter Spaces Access Key: " SPACES_KEY
    read -p "Enter Spaces Secret Key: " SPACES_SECRET
}

################################################################################
# Installation Steps
################################################################################

install_system_updates() {
    print_header "Step 1: Updating System"
    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y curl wget git build-essential software-properties-common
    print_success "System updated"
}

install_nodejs() {
    print_header "Step 2: Installing Node.js 20"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_info "Node.js already installed: $NODE_VERSION"
        if [[ "$NODE_VERSION" == v20* ]]; then
            print_success "Node.js 20 already installed"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js installed: $NODE_VERSION"
    print_success "npm installed: $NPM_VERSION"
}

install_mongodb() {
    print_header "Step 3: Installing MongoDB 7.0"
    
    if systemctl is-active --quiet mongod; then
        print_info "MongoDB already running"
        return
    fi
    
    # Import MongoDB GPG key
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
        sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    
    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    # Install MongoDB
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Start MongoDB
    sudo systemctl daemon-reload
    sudo systemctl enable mongod
    sudo systemctl start mongod
    
    sleep 5
    
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB installed and running"
    else
        print_error "MongoDB failed to start"
        exit 1
    fi
}

configure_mongodb() {
    print_header "Step 4: Configuring MongoDB"
    
    # Create admin user
    mongosh --eval "
    use admin;
    db.createUser({
        user: 'admin',
        pwd: '$MONGODB_PASSWORD',
        roles: ['root']
    });
    " 2>/dev/null || true
    
    # Create application database and user
    mongosh --eval "
    use ai-shorts;
    db.createUser({
        user: '$MONGODB_USER',
        pwd: '$MONGODB_PASSWORD',
        roles: [
            { role: 'readWrite', db: 'ai-shorts' },
            { role: 'dbAdmin', db: 'ai-shorts' }
        ]
    });
    " 2>/dev/null || true
    
    # Create indexes
    mongosh --eval "
    use ai-shorts;
    db.jobs.createIndex({ 'jobId': 1 });
    db.jobs.createIndex({ 'status': 1, 'createdAt': -1 });
    db.jobs.createIndex({ 'createdAt': -1 });
    db.users.createIndex({ 'email': 1 });
    " 2>/dev/null || true
    
    print_success "MongoDB configured with authentication"
    print_info "MongoDB User: $MONGODB_USER"
}

install_redis() {
    print_header "Step 5: Installing Redis"
    
    sudo apt install -y redis-server
    
    # Configure Redis
    sudo sed -i "s/^# requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
    sudo sed -i "s/^requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
    sudo sed -i "s/^supervised no/supervised systemd/" /etc/redis/redis.conf
    
    # Enable persistence
    sudo sed -i "s/^# save 900 1/save 900 1/" /etc/redis/redis.conf
    sudo sed -i "s/^# save 300 10/save 300 10/" /etc/redis/redis.conf
    sudo sed -i "s/^appendonly no/appendonly yes/" /etc/redis/redis.conf
    
    sudo systemctl enable redis-server
    sudo systemctl restart redis-server
    
    sleep 3
    
    if redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG; then
        print_success "Redis installed and configured"
    else
        print_error "Redis failed to start"
        exit 1
    fi
}

install_ffmpeg() {
    print_header "Step 6: Installing FFmpeg"
    
    sudo apt install -y ffmpeg
    
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    print_success "FFmpeg installed: $FFMPEG_VERSION"
}

install_nginx() {
    print_header "Step 7: Installing Nginx"
    
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    print_success "Nginx installed"
}

install_pm2() {
    print_header "Step 8: Installing PM2"
    
    if command -v pm2 &> /dev/null; then
        print_info "PM2 already installed"
    else
        sudo npm install -g pm2
    fi
    
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 installed: $PM2_VERSION"
}

clone_project() {
    print_header "Step 9: Cloning Project"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Project directory already exists"
        read -p "Remove and re-clone? (y/n): " RECLONE
        if [ "$RECLONE" = "y" ]; then
            rm -rf "$PROJECT_DIR"
        else
            print_info "Using existing directory"
            cd "$PROJECT_DIR"
            return
        fi
    fi
    
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    print_success "Project cloned from GitHub"
}

install_dependencies() {
    print_header "Step 10: Installing Project Dependencies"
    
    cd "$PROJECT_DIR"
    
    # Backend
    print_info "Installing backend dependencies..."
    cd backend
    npm install --production
    cd ..
    print_success "Backend dependencies installed"
    
    # Worker
    print_info "Installing worker dependencies..."
    cd worker
    npm install --production
    cd ..
    print_success "Worker dependencies installed"
    
    # Frontend
    print_info "Installing frontend dependencies..."
    cd frontend
    npm install
    print_success "Frontend dependencies installed"
}

configure_environment() {
    print_header "Step 11: Configuring Environment"
    
    cd "$PROJECT_DIR"
    
    # Create .env file
    cat > .env << EOF
# MongoDB
MONGO_URI=mongodb://$MONGODB_USER:$MONGODB_PASSWORD@localhost:27017/ai-shorts?authSource=ai-shorts

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Backend Server
PORT=5000
NODE_ENV=$NODE_ENV
LOG_LEVEL=info

# TTS Engine
TTS_ENGINE=elevenlabs

# ElevenLabs API
ELEVENLABS_API_KEY=$ELEVENLABS_KEY

# Image Generation API
IMAGE_API_TYPE=a1111
A1111_API_URL=$A1111_URL
A1111_STEPS=25
A1111_NEGATIVE_PROMPT=blurry, bad quality, distorted, ugly, watermark, text, signature

# DigitalOcean Spaces
SPACES_ENDPOINT=$SPACES_ENDPOINT
SPACES_REGION=nyc3
SPACES_BUCKET=$SPACES_BUCKET
SPACES_KEY=$SPACES_KEY
SPACES_SECRET=$SPACES_SECRET

# Frontend
NEXT_PUBLIC_API_URL=http://$DOMAIN/api
EOF
    
    # Copy to backend, worker directories
    cp .env backend/.env
    cp .env worker/.env
    
    # Create frontend .env.local
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://$DOMAIN/api
EOF
    
    print_success "Environment configured"
    
    # Save credentials
    cat > "$HOME/ai-shorts-credentials.txt" << EOF
================================================
AI Shorts Generator - Credentials
================================================

MongoDB:
  User: $MONGODB_USER
  Password: $MONGODB_PASSWORD
  Connection: mongodb://$MONGODB_USER:$MONGODB_PASSWORD@localhost:27017/ai-shorts

Redis:
  Password: $REDIS_PASSWORD

Domain: $DOMAIN

API Keys:
  ElevenLabs: $ELEVENLABS_KEY
  Spaces Bucket: $SPACES_BUCKET

================================================
SAVE THIS FILE SECURELY AND DELETE IT LATER!
================================================
EOF
    
    chmod 600 "$HOME/ai-shorts-credentials.txt"
    print_success "Credentials saved to: $HOME/ai-shorts-credentials.txt"
}

create_directories() {
    print_header "Step 12: Creating Required Directories"
    
    cd "$PROJECT_DIR"
    
    mkdir -p backend/logs
    mkdir -p worker/logs
    mkdir -p frontend/logs
    mkdir -p backend/temp/{scenes,audio,images,videos,final}
    mkdir -p backend/assets/music
    
    print_success "Directories created"
}

build_frontend() {
    print_header "Step 13: Building Frontend"
    
    cd "$PROJECT_DIR/frontend"
    npm run build
    
    print_success "Frontend built successfully"
}

configure_nginx() {
    print_header "Step 14: Configuring Nginx"
    
    sudo tee /etc/nginx/sites-available/ai-shorts > /dev/null << EOF
# Backend API
upstream backend {
    server localhost:5000;
}

# Frontend
upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase timeout for long video processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Increase upload size limit
    client_max_body_size 50M;
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/ai-shorts /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    print_success "Nginx configured"
}

configure_firewall() {
    print_header "Step 15: Configuring Firewall"
    
    sudo ufw --force enable
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force reload
    
    print_success "Firewall configured"
}

start_services() {
    print_header "Step 16: Starting Services with PM2"
    
    cd "$PROJECT_DIR"
    
    # Update queue.js and processor.js with Redis password
    sed -i "s/maxRetriesPerRequest: null/maxRetriesPerRequest: null,\n  password: process.env.REDIS_PASSWORD/" backend/src/services/queue.js
    sed -i "s/maxRetriesPerRequest: null/maxRetriesPerRequest: null,\n  password: process.env.REDIS_PASSWORD/" worker/processor.js
    
    # Stop any existing processes
    pm2 delete all 2>/dev/null || true
    
    # Start services
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup startup script
    PM2_STARTUP=$(pm2 startup systemd -u $USER --hp $HOME | grep "sudo")
    eval $PM2_STARTUP
    
    sleep 5
    
    # Check status
    pm2 status
    
    print_success "Services started with PM2"
}

setup_log_rotation() {
    print_header "Step 17: Setting Up Log Rotation"
    
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    
    print_success "Log rotation configured"
}

install_ssl() {
    print_header "Step 18: SSL Certificate Setup"
    
    if [ "$DOMAIN" = "localhost" ]; then
        print_warning "Skipping SSL for localhost"
        return
    fi
    
    read -p "Install Let's Encrypt SSL certificate? (y/n): " INSTALL_SSL
    if [ "$INSTALL_SSL" = "y" ]; then
        sudo apt install -y certbot python3-certbot-nginx
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
            print_warning "SSL installation failed. You can run it manually later:"
            print_info "sudo certbot --nginx -d $DOMAIN"
        }
    else
        print_info "SSL skipped. You can install it later with:"
        print_info "sudo certbot --nginx -d $DOMAIN"
    fi
}

create_maintenance_scripts() {
    print_header "Step 19: Creating Maintenance Scripts"
    
    # Backup script
    cat > "$HOME/backup-ai-shorts.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups/ai-shorts"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup MongoDB
mongodump --db ai-shorts --out "$BACKUP_DIR/mongodb_$DATE"

# Backup environment files
cp ~/ai-shorts-generator/.env "$BACKUP_DIR/env_$DATE"

# Compress
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE" "env_$DATE"
rm -rf "$BACKUP_DIR/mongodb_$DATE" "$BACKUP_DIR/env_$DATE"

# Delete old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/backup_$DATE.tar.gz"
EOF
    
    chmod +x "$HOME/backup-ai-shorts.sh"
    
    # Cleanup script
    cat > "$HOME/cleanup-temp.sh" << 'EOF'
#!/bin/bash
cd ~/ai-shorts-generator/backend
rm -rf temp/scenes/*
rm -rf temp/audio/*
rm -rf temp/images/*
rm -rf temp/videos/*
rm -rf temp/final/*
echo "Temp files cleaned"
EOF
    
    chmod +x "$HOME/cleanup-temp.sh"
    
    print_success "Maintenance scripts created"
}

verify_installation() {
    print_header "Step 20: Verifying Installation"
    
    echo "Checking services..."
    
    # MongoDB
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB is running"
    else
        print_error "MongoDB is not running"
    fi
    
    # Redis
    if redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
        print_success "Redis is running"
    else
        print_error "Redis is not running"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # PM2 processes
    pm2 list | grep -q "online" && print_success "PM2 services are running" || print_error "PM2 services failed"
    
    # Test backend
    sleep 5
    if curl -s http://localhost:5000/health | grep -q "ok"; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API not responding yet (may need a moment)"
    fi
}

print_completion() {
    print_header "🎉 Installation Complete!"
    
    cat << EOF

${GREEN}✅ AI Shorts Video Generator is now installed and running!${NC}

${BLUE}📝 Access Information:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Frontend:  http://$DOMAIN
  Backend:   http://$DOMAIN/api
  Health:    http://$DOMAIN/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${BLUE}🔐 Credentials:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Saved to: $HOME/ai-shorts-credentials.txt
  ${YELLOW}⚠️  Please save this file securely and delete it!${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${BLUE}🛠️  Useful Commands:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  View logs:       pm2 logs
  Restart all:     pm2 restart all
  Check status:    pm2 status
  Monitor:         pm2 monit
  Backup DB:       ~/backup-ai-shorts.sh
  Clean temp:      ~/cleanup-temp.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${BLUE}📊 System Status:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
    
    pm2 status
    
    echo ""
    echo -e "${GREEN}🚀 Your SaaS is ready! Visit http://$DOMAIN to start creating videos!${NC}"
    echo ""
    echo -e "${YELLOW}📚 For more information, check the documentation in:${NC}"
    echo -e "   $PROJECT_DIR/README.md"
    echo -e "   $PROJECT_DIR/DEPLOYMENT.md"
    echo ""
    echo -e "${BLUE}Installation log saved to: $LOG_FILE${NC}"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    
    print_header "AI Shorts Video Generator - Auto Installer"
    
    echo "This script will install and configure everything needed for"
    echo "the AI Shorts Video Generator SaaS on Ubuntu 22.04"
    echo ""
    echo "This includes:"
    echo "  • System dependencies (Node.js, MongoDB, Redis, FFmpeg, Nginx)"
    echo "  • Project cloning from GitHub"
    echo "  • Database configuration"
    echo "  • Environment setup"
    echo "  • Service deployment with PM2"
    echo "  • Nginx reverse proxy"
    echo "  • Firewall configuration"
    echo ""
    
    read -p "Continue with installation? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Pre-flight checks
    check_root
    check_ubuntu
    
    # Get user input
    prompt_domain
    prompt_api_keys
    
    echo ""
    read -p "Ready to begin installation? (y/n): " START
    if [ "$START" != "y" ]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Run installation steps
    install_system_updates
    install_nodejs
    install_mongodb
    configure_mongodb
    install_redis
    install_ffmpeg
    install_nginx
    install_pm2
    clone_project
    install_dependencies
    configure_environment
    create_directories
    build_frontend
    configure_nginx
    configure_firewall
    start_services
    setup_log_rotation
    install_ssl
    create_maintenance_scripts
    verify_installation
    
    # Complete
    print_completion
}

# Run main function
main "$@"
