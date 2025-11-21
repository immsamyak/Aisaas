# AI Shorts Video Generator

A complete production-ready SaaS that transforms text into fully rendered 1080x1920 short videos with AI-generated images, voiceovers, subtitles, and background music.

## 🎥 Features

- **AI Image Generation**: Stable Diffusion via Automatic1111 or ComfyUI API
- **High-Quality TTS**: ElevenLabs or Bark AI for natural voiceovers
- **Automatic Subtitles**: Perfectly synced with audio
- **Background Music**: Copyright-free music automatically mixed
- **Cloud Storage**: Videos stored in DigitalOcean Spaces
- **Queue System**: BullMQ with Redis for reliable processing
- **Real-time Progress**: Track video generation in real-time
- **Multiple Styles**: Realistic, cinematic, anime, digital art, and more

## 🏗️ Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────▶│   Backend    │─────▶│  BullMQ      │
│   Next.js    │      │   Express    │      │  Worker      │
└──────────────┘      └──────────────┘      └──────────────┘
                              │                     │
                              ▼                     ▼
                      ┌──────────────┐      ┌──────────────┐
                      │   MongoDB    │      │  AI Services │
                      └──────────────┘      │  - A1111/    │
                                            │    ComfyUI   │
                                            │  - ElevenLabs│
                                            │  - FFmpeg    │
                                            └──────────────┘
```

## 📁 Project Structure

```
project/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   ├── ai/         # AI services
│   │   │   └── video/      # Video rendering
│   │   ├── models/         # MongoDB models
│   │   └── utils/          # Utilities
│   ├── app.js              # Main application
│   └── package.json
│
├── worker/                  # BullMQ worker
│   ├── processor.js        # Job processor
│   ├── package.json
│   └── ecosystem.config.js
│
├── frontend/               # Next.js 14 frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── libs/              # API client
│   └── package.json
│
├── .env.example           # Environment template
├── ecosystem.config.js    # PM2 configuration
├── DEPLOYMENT.md         # Deployment guide
└── README.md             # This file
```

## 🚀 Tech Stack

### Backend
- **Node.js 20**: Runtime
- **Express**: Web framework
- **MongoDB**: Database
- **BullMQ**: Job queue
- **Redis**: Queue backend

### Frontend
- **Next.js 14**: React framework
- **Tailwind CSS**: Styling
- **Axios**: HTTP client

### AI Services
- **Automatic1111/ComfyUI**: Image generation
- **ElevenLabs/Bark**: Text-to-speech
- **FFmpeg**: Video rendering

### Infrastructure
- **PM2**: Process manager
- **Nginx**: Reverse proxy
- **DigitalOcean Spaces**: Cloud storage

## ⚙️ Installation

### Prerequisites

- Node.js 20+
- MongoDB
- Redis
- FFmpeg
- PM2 (for production)

### Local Development

1. **Clone the repository**

```bash
git clone <repo-url>
cd ai-shorts-generator
```

2. **Install dependencies**

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

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Start services**

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: MongoDB
mongod

# Terminal 3: Backend
cd backend
npm run dev

# Terminal 4: Worker
cd worker
npm start

# Terminal 5: Frontend
cd frontend
npm run dev
```

5. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 🌐 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide on DigitalOcean Ubuntu 22.04.

### Quick Start

```bash
# Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs redis-server mongodb-org ffmpeg nginx
sudo npm install -g pm2

# Clone and setup
git clone <repo-url>
cd ai-shorts-generator
cp .env.example .env
# Edit .env

# Install project dependencies
cd backend && npm install
cd ../worker && npm install
cd ../frontend && npm install && npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options.

**Required:**
- `MONGO_URI`: MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `ELEVENLABS_API_KEY`: ElevenLabs API key (if using)
- `A1111_API_URL`: Automatic1111 API endpoint (if using)
- `SPACES_*`: DigitalOcean Spaces credentials

**Optional:**
- `TTS_ENGINE`: `elevenlabs` or `bark` (default: elevenlabs)
- `IMAGE_API_TYPE`: `a1111` or `comfyui` (default: a1111)

## 📝 API Documentation

### Generate Video

```http
POST /api/generate
Content-Type: application/json

{
  "text": "Your text here...",
  "voiceId": "default",
  "imageStyle": "realistic",
  "musicEnabled": true,
  "subtitlesEnabled": true
}
```

Response:
```json
{
  "success": true,
  "jobId": "uuid-here",
  "message": "Video generation started",
  "estimatedTime": "2-5 minutes"
}
```

### Get Job Status

```http
GET /api/job/:jobId
```

Response:
```json
{
  "success": true,
  "job": {
    "jobId": "uuid-here",
    "status": "processing",
    "progress": 45,
    "currentStep": "Generating audio 2/5",
    "videoUrl": null,
    "error": null
  }
}
```

### Get Video URL

```http
GET /api/video/:jobId
```

Response:
```json
{
  "success": true,
  "video": {
    "jobId": "uuid-here",
    "videoUrl": "https://your-space.digitaloceanspaces.com/...",
    "thumbnailUrl": "https://...",
    "duration": 45.5,
    "fileSize": 12582912
  }
}
```

## 🎨 Customization

### Adding Custom Styles

Edit `backend/src/services/ai/imageGenerator.js`:

```javascript
const stylePrompts = {
  realistic: 'photorealistic, highly detailed, 8k',
  your_style: 'your style prompt here',
  // Add more styles
};
```

### Adding Voices

Edit `backend/src/services/ai/ttsGenerator.js`:

```javascript
const elevenLabsVoices = {
  'default': 'voice-id-here',
  'your_voice': 'new-voice-id',
  // Add more voices
};
```

### Changing Video Resolution

Edit `backend/src/services/video/ffmpegCommands.js`:

```javascript
// Change from 1080x1920 to your desired resolution
scale=1080:1920
```

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:5000/health

# Generate test video
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Test video generation"}'
```

### Monitor Worker

```bash
pm2 logs ai-shorts-worker
```

## 📊 Monitoring

### PM2 Dashboard

```bash
pm2 monit
```

### View Logs

```bash
pm2 logs
pm2 logs ai-shorts-backend
pm2 logs ai-shorts-worker
```

### Check Queue

```bash
redis-cli
> LLEN bull:video-generation:wait
> LLEN bull:video-generation:active
```

## 🐛 Troubleshooting

### Worker Not Processing

```bash
# Check Redis connection
redis-cli ping

# Check worker logs
pm2 logs ai-shorts-worker

# Restart worker
pm2 restart ai-shorts-worker
```

### Video Generation Fails

1. Check A1111/ComfyUI API is accessible
2. Verify ElevenLabs API key
3. Check FFmpeg is installed: `ffmpeg -version`
4. Check disk space: `df -h`
5. View worker logs for errors

### Upload Fails

1. Verify DigitalOcean Spaces credentials
2. Check bucket permissions
3. Test connection:

```bash
curl -X GET https://your-bucket.nyc3.digitaloceanspaces.com
```

## 🔒 Security

- Always use environment variables for secrets
- Enable MongoDB authentication in production
- Use Redis password
- Configure firewall (UFW)
- Use SSL/TLS (Let's Encrypt)
- Implement rate limiting
- Regular security updates

## 📈 Performance Optimization

- Use PM2 clustering for workers
- Enable Redis persistence
- Add MongoDB indexes
- Use CDN for static assets
- Implement caching
- Regular cleanup of temp files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check logs: `pm2 logs`
- Review [DEPLOYMENT.md](DEPLOYMENT.md)
- Check GitHub issues

## 🎯 Roadmap

- [ ] User authentication
- [ ] Stripe payment integration
- [ ] Video templates
- [ ] Batch processing
- [ ] API access
- [ ] Custom branding
- [ ] Analytics dashboard
- [ ] Multi-language support

## 🙏 Acknowledgments

- Automatic1111 for Stable Diffusion web UI
- ComfyUI for ComfyUI framework
- ElevenLabs for TTS API
- FFmpeg for video processing
- DigitalOcean for cloud infrastructure

---

Made with ❤️ for content creators
