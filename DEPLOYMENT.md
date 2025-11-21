# AI Shorts Video Generator - Deployment Guide

Complete step-by-step guide to deploy the AI Shorts Video Generator SaaS on DigitalOcean Ubuntu 22.04 server.

## Prerequisites

- DigitalOcean Droplet with Ubuntu 22.04 (4GB RAM minimum, 8GB recommended)
- Domain name (optional, but recommended)
- DigitalOcean Spaces account for video storage
- ElevenLabs API key OR Bark setup for TTS
- Automatic1111 or ComfyUI API endpoint for image generation

## Step 1: Initial Server Setup

### 1.1 Connect to Your Server

```bash
ssh root@your_server_ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Create a Non-Root User

```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

## Step 2: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x
npm --version
```

## Step 3: Install PM2

```bash
sudo npm install -g pm2
pm2 --version
```

## Step 4: Install FFmpeg

```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

## Step 5: Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping  # Should return PONG
```

## Step 6: Install MongoDB

### 6.1 Option A: Local MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```

### 6.2 Option B: MongoDB Atlas (Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Use it in the .env file

## Step 7: Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 8: Clone and Setup Project

### 8.1 Clone Repository

```bash
cd /home/deployer
git clone https://github.com/your-repo/ai-shorts-generator.git
cd ai-shorts-generator
```

### 8.2 Install Dependencies

```bash
# Backend
cd backend
npm install
cd ..

# Worker
cd worker
npm install
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..
```

## Step 9: Configure Environment Variables

### 9.1 Copy Environment File

```bash
cp .env.example .env
nano .env
```

### 9.2 Update .env File

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/ai-shorts
# Or use Atlas: mongodb+srv://username:password@cluster.mongodb.net/ai-shorts

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=5000
NODE_ENV=production

# TTS Engine
TTS_ENGINE=elevenlabs
ELEVENLABS_API_KEY=your_actual_key_here

# Image Generation
IMAGE_API_TYPE=a1111
A1111_API_URL=http://your-a1111-server:7860

# DigitalOcean Spaces
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-bucket-name
SPACES_KEY=your_spaces_key
SPACES_SECRET=your_spaces_secret

# Frontend
NEXT_PUBLIC_API_URL=http://your-domain.com/api
```

Save and exit (Ctrl+X, Y, Enter)

## Step 10: Setup DigitalOcean Spaces

1. Go to DigitalOcean console → Spaces
2. Create a new Space (e.g., "ai-shorts-videos")
3. Create API keys (Spaces access keys)
4. Make the Space public or configure CORS if needed
5. Update .env with your Spaces credentials

## Step 11: Setup Automatic1111 or ComfyUI

### Option A: Remote A1111 API

If you have A1111 running on another server:

```env
A1111_API_URL=http://your-a1111-server:7860
```

### Option B: Local A1111 (Requires GPU)

```bash
# Install Python dependencies
sudo apt install -y python3-pip python3-venv

# Clone Automatic1111
cd /home/deployer
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run installation
./webui.sh --api --listen --port 7860

# Setup as systemd service (optional)
```

## Step 12: Create Required Directories

```bash
cd /home/deployer/ai-shorts-generator
mkdir -p backend/logs
mkdir -p worker/logs
mkdir -p frontend/logs
mkdir -p backend/temp/{scenes,audio,images,videos,final}
mkdir -p backend/assets/music
```

### 12.1 Add Background Music (Optional)

```bash
# Download copyright-free music and place in backend/assets/music/
cd backend/assets/music
# Add your .mp3 files here
```

## Step 13: Start Services with PM2

```bash
cd /home/deployer/ai-shorts-generator

# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you (run with sudo)
```

## Step 14: Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/ai-shorts
```

Add the following configuration:

```nginx
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
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for long video processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Increase upload size limit
    client_max_body_size 50M;
}
```

### 14.1 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/ai-shorts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 15: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts. Certbot will automatically configure SSL.

## Step 16: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 17: Setup Monitoring and Logs

### 17.1 PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 17.2 System Monitoring

```bash
# View PM2 dashboard
pm2 monit

# View specific logs
pm2 logs ai-shorts-backend
pm2 logs ai-shorts-worker
pm2 logs ai-shorts-frontend

# Restart specific service
pm2 restart ai-shorts-backend
```

## Step 18: Test the Application

### 18.1 Check Backend Health

```bash
curl http://localhost:5000/health
```

Should return:
```json
{"status":"ok","timestamp":"...","service":"ai-shorts-backend"}
```

### 18.2 Check Frontend

```bash
curl http://localhost:3000
```

### 18.3 Test Full Pipeline

1. Open browser: http://your-domain.com
2. Click "Create Video"
3. Enter sample text
4. Submit and monitor progress

## Step 19: Troubleshooting

### Check Service Status

```bash
pm2 status
```

### View Logs

```bash
pm2 logs --lines 100
```

### Restart Services

```bash
pm2 restart all
```

### Check MongoDB

```bash
sudo systemctl status mongod
mongosh  # or mongo
```

### Check Redis

```bash
redis-cli ping
redis-cli info
```

### Check Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

### Check Disk Space

```bash
df -h
du -sh /home/deployer/ai-shorts-generator/backend/temp/*
```

### Clean Up Temp Files

```bash
cd /home/deployer/ai-shorts-generator/backend
rm -rf temp/scenes/*
rm -rf temp/audio/*
rm -rf temp/images/*
rm -rf temp/videos/*
rm -rf temp/final/*
```

## Step 20: Maintenance

### Regular Updates

```bash
cd /home/deployer/ai-shorts-generator
git pull
cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install && npm run build
pm2 restart all
```

### Database Backup

```bash
# Local MongoDB
mongodump --db ai-shorts --out /backup/mongodb/$(date +%Y%m%d)

# Automated backup script
nano /home/deployer/backup.sh
```

Add:
```bash
#!/bin/bash
mongodump --db ai-shorts --out /backup/mongodb/$(date +%Y%m%d)
find /backup/mongodb -type d -mtime +7 -exec rm -rf {} +
```

```bash
chmod +x /home/deployer/backup.sh
crontab -e
```

Add daily backup at 2 AM:
```
0 2 * * * /home/deployer/backup.sh
```

### Monitor Resources

```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check PM2 metrics
pm2 monit
```

## Step 21: Production Optimization

### 21.1 Enable PM2 Clustering for Worker

Already configured in ecosystem.config.js with 2 instances.

### 21.2 Redis Persistence

```bash
sudo nano /etc/redis/redis.conf
```

Ensure these lines are set:
```
save 900 1
save 300 10
save 60 10000
appendonly yes
```

```bash
sudo systemctl restart redis-server
```

### 21.3 MongoDB Optimization

```bash
mongosh
use ai-shorts
db.jobs.createIndex({ "jobId": 1 })
db.jobs.createIndex({ "status": 1, "createdAt": -1 })
db.jobs.createIndex({ "createdAt": -1 })
exit
```

## Step 22: Security Hardening

### 22.1 Secure MongoDB

```bash
mongosh
use admin
db.createUser({
  user: "ai_shorts_admin",
  pwd: "strong_password_here",
  roles: [ { role: "readWrite", db: "ai-shorts" } ]
})
exit
```

Update MONGO_URI in .env:
```
MONGO_URI=mongodb://ai_shorts_admin:strong_password_here@localhost:27017/ai-shorts
```

### 22.2 Secure Redis

```bash
sudo nano /etc/redis/redis.conf
```

Add:
```
requirepass your_redis_password_here
```

Update .env:
```
REDIS_PASSWORD=your_redis_password_here
```

Update code to use password (in queue.js and processor.js):
```javascript
const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});
```

### 22.3 Rate Limiting (Optional)

Install express-rate-limit in backend:
```bash
cd backend
npm install express-rate-limit
```

## Deployment Complete! 🎉

Your AI Shorts Video Generator is now live at:
- Frontend: http://your-domain.com
- Backend API: http://your-domain.com/api

## Quick Reference Commands

```bash
# View all services
pm2 status

# View logs
pm2 logs

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart ai-shorts-backend

# Stop all services
pm2 stop all

# Monitor services
pm2 monit

# Check Nginx
sudo systemctl status nginx

# Check Redis
redis-cli ping

# Check MongoDB
sudo systemctl status mongod
```

## Support

For issues or questions, check the logs:
```bash
pm2 logs --lines 200
```

Monitor system resources:
```bash
htop  # Install with: sudo apt install htop
```
