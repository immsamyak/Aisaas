# AI Shorts Generator - Quick Reference Card

## 🚀 Quick Start (Development)

```bash
# 1. Install dependencies
cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start services (5 terminals)
mongod                      # Terminal 1
redis-server               # Terminal 2
cd backend && npm run dev  # Terminal 3
cd worker && npm start     # Terminal 4
cd frontend && npm run dev # Terminal 5

# 4. Open browser
http://localhost:3000
```

## 🌐 Quick Start (Production)

```bash
# 1. Install system dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mongodb-org redis-server ffmpeg nginx
sudo npm install -g pm2

# 2. Clone and setup
git clone <repo> && cd ai-shorts-generator
cp .env.example .env && nano .env

# 3. Install and build
cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install && npm run build

# 4. Start with PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 5. Configure Nginx
sudo nano /etc/nginx/sites-available/ai-shorts
sudo ln -s /etc/nginx/sites-available/ai-shorts /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## 📂 Project Structure

```
backend/     → Express API (port 5000)
worker/      → BullMQ processor
frontend/    → Next.js UI (port 3000)
```

## 🔑 Essential Environment Variables

```env
# Database
MONGO_URI=mongodb://localhost:27017/ai-shorts
REDIS_HOST=localhost

# AI Services
TTS_ENGINE=elevenlabs
ELEVENLABS_API_KEY=your_key
IMAGE_API_TYPE=a1111
A1111_API_URL=http://127.0.0.1:7860

# Storage
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_BUCKET=your-bucket
SPACES_KEY=your_key
SPACES_SECRET=your_secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🎯 API Endpoints

```
POST   /api/generate      → Create video job
GET    /api/job/:id       → Get job status
GET    /api/video/:id     → Get video URL
GET    /api/jobs          → List all jobs
DELETE /api/job/:id       → Delete job
GET    /health            → Health check
```

## 📊 PM2 Commands

```bash
pm2 start ecosystem.config.js  # Start all
pm2 stop all                   # Stop all
pm2 restart all                # Restart all
pm2 logs                       # View logs
pm2 monit                      # Monitor
pm2 status                     # Check status
pm2 delete all                 # Remove all

# Specific service
pm2 restart ai-shorts-backend
pm2 logs ai-shorts-worker
```

## 🔧 Troubleshooting

```bash
# Check services
sudo systemctl status mongodb
sudo systemctl status redis
redis-cli ping
mongosh --eval "db.version()"

# Check logs
pm2 logs --lines 100
tail -f backend/logs/combined.log

# Check queue
redis-cli
> LLEN bull:video-generation:wait
> LLEN bull:video-generation:active

# Check disk space
df -h
du -sh backend/temp/*

# Clean temp files
rm -rf backend/temp/scenes/*
rm -rf backend/temp/audio/*
rm -rf backend/temp/images/*
```

## 🎬 Video Generation Flow

```
Text Input
  ↓
Split into scenes (10-18 words)
  ↓
Generate images (A1111/ComfyUI)
  ↓
Generate audio (ElevenLabs/Bark)
  ↓
Create scene videos (FFmpeg)
  ↓
Concatenate scenes
  ↓
Add subtitles
  ↓
Add background music
  ↓
Optimize & upload
  ↓
Final video URL
```

## 🔒 Security Checklist

- [ ] Change default passwords
- [ ] Enable MongoDB authentication
- [ ] Set Redis password
- [ ] Configure firewall (UFW)
- [ ] Setup SSL with Let's Encrypt
- [ ] Use environment variables
- [ ] Implement rate limiting
- [ ] Regular security updates

## 📈 Performance Tips

- Use PM2 clustering (already configured)
- Enable Redis persistence
- Add MongoDB indexes (included)
- Use CDN for Spaces
- Regular temp file cleanup
- Monitor with `pm2 monit`

## 🐛 Common Issues

**MongoDB connection error**
```bash
sudo systemctl start mongodb
```

**Redis connection error**
```bash
sudo systemctl start redis
```

**FFmpeg not found**
```bash
sudo apt install ffmpeg
```

**Port already in use**
```bash
# Change PORT in .env
lsof -i :5000  # Find process
```

**Worker not processing**
```bash
pm2 restart ai-shorts-worker
pm2 logs ai-shorts-worker
```

## 📝 Quick API Test

```bash
# Generate video
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Test video generation"}'

# Check status
curl http://localhost:5000/api/job/JOB_ID_HERE
```

## 🎨 Customization

**Add new style:**
Edit `backend/src/services/ai/imageGenerator.js`

**Add new voice:**
Edit `backend/src/services/ai/ttsGenerator.js`

**Change resolution:**
Edit `backend/src/services/video/ffmpegCommands.js`

## 📦 Directory Structure

```
backend/src/
  ├── controllers/    # Request handlers
  ├── routes/         # API routes
  ├── services/       # Business logic
  │   ├── ai/         # AI services
  │   └── video/      # Video rendering
  ├── models/         # DB models
  └── utils/          # Utilities

frontend/
  ├── app/            # Pages
  ├── components/     # React components
  └── libs/           # API client

worker/
  └── processor.js    # Job processor
```

## 🎯 Resource Requirements

**Minimum (Development):**
- 4GB RAM
- 2 CPU cores
- 20GB storage

**Recommended (Production):**
- 8GB RAM
- 4 CPU cores
- 100GB+ storage

**For scale:**
- Load balancer
- Multiple worker servers
- MongoDB Atlas
- Managed Redis

## 📚 Documentation Files

- `README.md` - Main documentation
- `DEPLOYMENT.md` - Full deployment guide
- `LOCAL_SETUP.md` - Local dev setup
- `API_EXAMPLES.md` - API usage examples
- `PROJECT_SUMMARY.md` - Complete overview

## ⚡ Performance Benchmarks

**Typical video generation time:**
- 2-4 scenes: 2-3 minutes
- 5-8 scenes: 3-5 minutes
- 9+ scenes: 5-8 minutes

**Concurrent jobs:**
- 1 worker: 1-2 jobs
- 2 workers: 2-4 jobs
- Scale linearly with workers

## 🌟 Key Features

✅ AI image generation (Stable Diffusion)
✅ High-quality TTS (ElevenLabs/Bark)
✅ Automatic subtitles
✅ Background music mixing
✅ Cloud storage (Spaces)
✅ Real-time progress
✅ Queue-based processing
✅ Production-ready

## 🎓 Learning Resources

- FFmpeg: https://ffmpeg.org/documentation.html
- BullMQ: https://docs.bullmq.io/
- Next.js: https://nextjs.org/docs
- PM2: https://pm2.keymetrics.io/docs/

## 🆘 Get Help

1. Check logs: `pm2 logs`
2. Review documentation
3. Test individual services
4. Check GitHub issues

---

**Quick Links:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health: http://localhost:5000/health

**Support:** Check logs and documentation first!

---
Made with ❤️ | Version 1.0.0
