# Local Development Setup

Quick guide to get the AI Shorts Video Generator running locally.

## Prerequisites

Install the following:

1. **Node.js 20+**: https://nodejs.org/
2. **MongoDB**: https://www.mongodb.com/try/download/community
3. **Redis**: https://redis.io/download
4. **FFmpeg**: https://ffmpeg.org/download.html

### Windows Installation

```powershell
# Using Chocolatey
choco install nodejs ffmpeg

# MongoDB
# Download and install from: https://www.mongodb.com/try/download/community

# Redis
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL2
```

### macOS Installation

```bash
# Using Homebrew
brew install node@20 mongodb-community redis ffmpeg
brew services start mongodb-community
brew services start redis
```

### Linux Installation

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB
sudo apt install -y mongodb

# Redis
sudo apt install -y redis-server

# FFmpeg
sudo apt install -y ffmpeg
```

## Setup Steps

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd ai-shorts-generator
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Worker
cd ../worker
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Setup Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB (local)
MONGO_URI=mongodb://localhost:27017/ai-shorts

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
PORT=5000
NODE_ENV=development

# TTS (use ElevenLabs for better quality)
TTS_ENGINE=elevenlabs
ELEVENLABS_API_KEY=your_key_here

# Image Generation (requires A1111 or ComfyUI running)
IMAGE_API_TYPE=a1111
A1111_API_URL=http://127.0.0.1:7860

# DigitalOcean Spaces (for production)
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_BUCKET=your-bucket
SPACES_KEY=your-key
SPACES_SECRET=your-secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Setup Automatic1111 (Optional, for AI Images)

If you don't have A1111 running:

```bash
# Clone A1111
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Run with API enabled
./webui.sh --api --listen
# Windows: webui-user.bat --api --listen
```

Or use a remote A1111 API endpoint.

### 5. Add Background Music

```bash
# Create music directory
mkdir -p backend/assets/music

# Add copyright-free MP3 files
# Download from: https://incompetech.com/ or https://freemusicarchive.org/
```

### 6. Start Services

Open 5 terminal windows:

**Terminal 1: MongoDB**
```bash
mongod
# Or if installed as service: sudo systemctl start mongodb
```

**Terminal 2: Redis**
```bash
redis-server
# Or if installed as service: sudo systemctl start redis
```

**Terminal 3: Backend**
```bash
cd backend
npm run dev
# Should start on http://localhost:5000
```

**Terminal 4: Worker**
```bash
cd worker
npm start
# Should connect to Redis and MongoDB
```

**Terminal 5: Frontend**
```bash
cd frontend
npm run dev
# Should start on http://localhost:3000
```

### 7. Test the Application

1. Open browser: http://localhost:3000
2. Click "Create Video"
3. Enter sample text:
   ```
   The ocean is vast and mysterious. Its depths hold countless secrets. 
   Marine life thrives in the coral reefs. Whales sing their ancient songs.
   ```
4. Click "Generate Video"
5. Monitor progress on the job status page

## Development Tips

### Hot Reload

- Frontend: Next.js hot reload enabled by default
- Backend: Use `npm run dev` for auto-restart with `--watch`
- Worker: Restart manually after changes

### Debugging

**Backend logs:**
```bash
cd backend
tail -f logs/combined.log
```

**Worker logs:**
```bash
cd worker
# Logs are output to console
```

**Check Redis queue:**
```bash
redis-cli
> KEYS bull:*
> LLEN bull:video-generation:wait
> LLEN bull:video-generation:active
```

**Check MongoDB jobs:**
```bash
mongosh ai-shorts
> db.jobs.find().sort({createdAt: -1}).limit(5)
> db.jobs.countDocuments({status: "processing"})
```

### Testing Without AI Services

If you don't have A1111 or ElevenLabs:

1. The system will create placeholder images (colored rectangles)
2. TTS will generate silent audio
3. Video will still be created with subtitles

### Port Conflicts

If ports are in use:

```bash
# Find process using port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Change ports in:
# - backend/.env (PORT)
# - frontend/.env (NEXT_PUBLIC_API_URL)
```

### Clean Temp Files

```bash
cd backend
rm -rf temp/scenes/*
rm -rf temp/audio/*
rm -rf temp/images/*
rm -rf temp/videos/*
rm -rf temp/final/*
```

## Common Issues

### MongoDB Connection Error

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS
```

### FFmpeg Not Found

```bash
# Check installation
ffmpeg -version

# Add to PATH if needed (Windows)
# Add FFmpeg bin directory to system PATH
```

### ElevenLabs API Error

- Check API key is valid
- Check API quota/credits
- Use alternative: Set `TTS_ENGINE=bark` in .env

### A1111 Connection Error

- Make sure A1111 is running with `--api` flag
- Check URL in .env matches A1111 address
- Test: `curl http://127.0.0.1:7860/sdapi/v1/sd-models`

## Next Steps

Once everything is running:

1. Test the full pipeline with short text
2. Check video quality
3. Adjust styles and voices
4. Add custom background music
5. Customize the UI
6. Prepare for deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).
