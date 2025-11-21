# System Architecture Diagrams

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                │
│                         http://your-domain.com                           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────▼───────────────────────────────────────────┐
│                             NGINX (Port 80/443)                          │
│                          Reverse Proxy + SSL                             │
└────────────┬────────────────────────────────────────────┬────────────────┘
             │                                             │
             │ Proxy /                                     │ Proxy /api
             │                                             │
┌────────────▼────────────────┐             ┌─────────────▼──────────────┐
│   NEXT.JS FRONTEND          │             │   EXPRESS BACKEND          │
│      (Port 3000)            │             │      (Port 5000)           │
│                             │             │                            │
│  • Homepage                 │             │  • REST API                │
│  • Create Video Page        │◄───────────►│  • Controllers             │
│  • Video Status Page        │   Axios     │  • Routes                  │
│  • Components               │   HTTP      │  • Models                  │
│                             │   Client    │  • Utils                   │
└─────────────────────────────┘             └────────────┬───────────────┘
                                                          │
                                                          │ Enqueue Job
                                                          │
                              ┌───────────────────────────▼──────────┐
                              │       REDIS (Port 6379)              │
                              │     BullMQ Queue Backend             │
                              │                                      │
                              │  • video-generation queue            │
                              │  • Job persistence                   │
                              │  • Progress tracking                 │
                              └───────────┬──────────────────────────┘
                                          │
                                          │ Consume Jobs
                                          │
                              ┌───────────▼──────────────────────────┐
                              │   BULLMQ WORKER (2 instances)        │
                              │      Video Processing Engine         │
                              │                                      │
                              │  1. Text Splitting                   │
                              │  2. AI Image Generation ──────┐     │
                              │  3. TTS Audio Generation      │     │
                              │  4. FFmpeg Video Rendering    │     │
                              │  5. Upload to Spaces          │     │
                              └───────┬─────────────┬─────────┘     │
                                      │             │               │
                                      │             │               │
              ┌───────────────────────┼─────────────┼───────────────┼──────┐
              │                       │             │               │      │
              │                       │             │               │      │
┌─────────────▼────────┐  ┌──────────▼─────┐  ┌───▼──────┐  ┌────▼──────▼─────┐
│    MONGODB           │  │   FFMPEG       │  │ A1111/   │  │  DIGITALOCEAN   │
│   (Port 27017)       │  │   Binary       │  │ ComfyUI  │  │    SPACES       │
│                      │  │                │  │   API    │  │                 │
│ • Jobs collection    │  │ • Create video │  │          │  │ • Video storage │
│ • Users collection   │  │ • Concat       │  │ • Image  │  │ • Thumbnails    │
│ • Indexes            │  │ • Subtitles    │  │   gen    │  │ • Public URLs   │
│                      │  │ • Music        │  │          │  │                 │
└──────────────────────┘  └────────────────┘  └──────────┘  └─────────────────┘
                                                    │
                                                    │
                                          ┌─────────▼─────────┐
                                          │  ELEVENLABS API   │
                                          │     or BARK       │
                                          │                   │
                                          │  • TTS Generation │
                                          │  • Voice cloning  │
                                          └───────────────────┘
```

## Video Generation Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIDEO GENERATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────┘

  USER INPUT
      │
      │ "The ocean is vast..."
      │
      ▼
┌─────────────────┐
│  TEXT SPLITTER  │  Split text into 10-18 word scenes
└────────┬────────┘
         │
         ├── Scene 1: "The ocean is vast and mysterious..."
         ├── Scene 2: "Its depths hold countless secrets..."
         ├── Scene 3: "Marine life thrives in coral reefs..."
         └── Scene 4: "Whales sing their ancient songs..."
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│              IMAGE GENERATION (Parallel)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Scene 1  │  │ Scene 2  │  │ Scene 3  │  │ Scene 4  │   │
│  │ A1111 API│  │ A1111 API│  │ A1111 API│  │ A1111 API│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│   scene_0.png   scene_1.png   scene_2.png   scene_3.png   │
└───────┬────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              AUDIO GENERATION (Sequential)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Scene 1  │  │ Scene 2  │  │ Scene 3  │  │ Scene 4  │   │
│  │ElevenLabs│  │ElevenLabs│  │ElevenLabs│  │ElevenLabs│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│   scene_0.wav   scene_1.wav   scene_2.wav   scene_3.wav   │
└───────┬────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│           CREATE SCENE VIDEOS (FFmpeg)                       │
│                                                              │
│  scene_0.png + scene_0.wav → scene_0.mp4 (5.2s)            │
│  scene_1.png + scene_1.wav → scene_1.mp4 (4.8s)            │
│  scene_2.png + scene_2.wav → scene_2.mp4 (5.5s)            │
│  scene_3.png + scene_3.wav → scene_3.mp4 (4.3s)            │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              CONCATENATE VIDEOS (FFmpeg)                     │
│                                                              │
│  list.txt → ffmpeg concat → combined.mp4 (19.8s)            │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              ADD SUBTITLES (FFmpeg)                          │
│                                                              │
│  subtitles.srt + combined.mp4 → subtitled.mp4               │
│                                                              │
│  1                                                           │
│  00:00:00,000 --> 00:00:05,200                              │
│  The ocean is vast and mysterious...                        │
│                                                              │
│  2                                                           │
│  00:00:05,200 --> 00:00:10,000                              │
│  Its depths hold countless secrets...                       │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│          ADD BACKGROUND MUSIC (FFmpeg)                       │
│                                                              │
│  music.mp3 + subtitled.mp4 → with_music.mp4                 │
│  (Volume: 30%, Fade out at end)                             │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              OPTIMIZE VIDEO (FFmpeg)                         │
│                                                              │
│  with_music.mp4 → final.mp4                                  │
│  • H.264 codec                                               │
│  • AAC audio                                                 │
│  • 1080x1920 resolution                                      │
│  • Web-optimized                                             │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│         UPLOAD TO DIGITALOCEAN SPACES                        │
│                                                              │
│  final.mp4 → https://bucket.nyc3.digitaloceanspaces.com/... │
│  thumb.jpg → https://bucket.nyc3.digitaloceanspaces.com/... │
└───────┬──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              UPDATE JOB STATUS                               │
│                                                              │
│  Status: completed                                           │
│  Progress: 100%                                              │
│  Video URL: https://...final.mp4                             │
│  Duration: 19.8s                                             │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
    USER GETS VIDEO
```

## Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         JOB DOCUMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  jobId: "550e8400-e29b-41d4-a716-446655440000"                 │
│  userId: ObjectId (optional)                                    │
│  inputText: "The ocean is vast and mysterious..."              │
│                                                                 │
│  status: "completed" | "processing" | "pending" | "failed"     │
│  progress: 100 (0-100)                                          │
│  currentStep: "Finalizing"                                      │
│                                                                 │
│  scenes: [                                                      │
│    {                                                            │
│      sceneIndex: 0,                                             │
│      text: "The ocean is vast...",                              │
│      imageUrl: "local path",                                    │
│      audioUrl: "local path",                                    │
│      duration: 5.2                                              │
│    },                                                           │
│    ...                                                          │
│  ]                                                              │
│                                                                 │
│  settings: {                                                    │
│    voiceId: "default",                                          │
│    imageStyle: "cinematic",                                     │
│    musicEnabled: true,                                          │
│    subtitlesEnabled: true                                       │
│  }                                                              │
│                                                                 │
│  videoUrl: "https://spaces.../final.mp4"                        │
│  videoKey: "videos/550e8400.../final.mp4"                       │
│  thumbnailUrl: "https://spaces.../thumb.jpg"                    │
│  duration: 19.8                                                 │
│                                                                 │
│  metadata: {                                                    │
│    resolution: "1080x1920",                                     │
│    fps: 30,                                                     │
│    fileSize: 12582912,                                          │
│    totalScenes: 4                                               │
│  }                                                              │
│                                                                 │
│  error: null                                                    │
│  processingTime: 195 (seconds)                                  │
│                                                                 │
│  createdAt: ISODate("2025-11-21T10:30:00Z")                    │
│  completedAt: ISODate("2025-11-21T10:33:15Z")                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Request/Response Flow

```
┌──────────┐                                      ┌──────────┐
│  CLIENT  │                                      │  BACKEND │
└────┬─────┘                                      └────┬─────┘
     │                                                 │
     │  POST /api/generate                             │
     │  { text, voiceId, style, ... }                  │
     ├────────────────────────────────────────────────►│
     │                                                 │
     │                                            Validate Input
     │                                            Create Job Doc
     │                                            Enqueue to BullMQ
     │                                                 │
     │  { success: true, jobId: "..." }               │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  GET /api/job/:id (Poll every 2s)              │
     ├────────────────────────────────────────────────►│
     │                                                 │
     │                                            Query MongoDB
     │                                                 │
     │  { status: "processing", progress: 45 }        │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  GET /api/job/:id                               │
     ├────────────────────────────────────────────────►│
     │                                                 │
     │  { status: "completed", videoUrl: "..." }      │
     │◄────────────────────────────────────────────────┤
     │                                                 │
     │  Display Video Player                           │
     │                                                 │
```

## Directory Tree (Complete)

```
ai-shorts-generator/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── videoController.js
│   │   ├── routes/
│   │   │   └── videoRoutes.js
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── textSplitter.js
│   │   │   │   ├── imageGenerator.js
│   │   │   │   └── ttsGenerator.js
│   │   │   ├── video/
│   │   │   │   ├── ffmpegCommands.js
│   │   │   │   └── renderService.js
│   │   │   └── queue.js
│   │   ├── models/
│   │   │   ├── Job.js
│   │   │   └── User.js
│   │   └── utils/
│   │       ├── logger.js
│   │       └── spacesClient.js
│   ├── temp/                    # Generated at runtime
│   │   ├── scenes/
│   │   ├── audio/
│   │   ├── images/
│   │   ├── videos/
│   │   └── final/
│   ├── assets/
│   │   └── music/              # Add your .mp3 files
│   ├── logs/                   # Generated at runtime
│   ├── app.js
│   ├── package.json
│   └── ecosystem.config.js
│
├── worker/
│   ├── logs/                   # Generated at runtime
│   ├── processor.js
│   ├── package.json
│   └── ecosystem.config.js
│
├── frontend/
│   ├── app/
│   │   ├── page.jsx
│   │   ├── layout.jsx
│   │   ├── globals.css
│   │   ├── create/
│   │   │   └── page.jsx
│   │   └── video/
│   │       └── [id]/
│   │           └── page.jsx
│   ├── components/
│   │   ├── TextInput.jsx
│   │   ├── LoadingUI.jsx
│   │   └── VideoCard.jsx
│   ├── libs/
│   │   └── api.js
│   ├── public/
│   ├── .next/                  # Generated after build
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.js
│   └── .babelrc
│
├── .env.example
├── .env                        # Create from .env.example
├── .gitignore
├── ecosystem.config.js
├── package.json
├── LICENSE
├── README.md
├── DEPLOYMENT.md
├── LOCAL_SETUP.md
├── API_EXAMPLES.md
├── PROJECT_SUMMARY.md
├── QUICK_REFERENCE.md
├── ARCHITECTURE.md             # This file
└── install.sh
```

## Technology Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       PRESENTATION                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Next.js   │  │ Tailwind CSS │  │  Lucide Icons    │    │
│  │   14.0     │  │     3.3      │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        APPLICATION                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Express   │  │    BullMQ    │  │     Winston      │    │
│  │    4.18    │  │     5.1      │  │      3.11        │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          DATA                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  MongoDB   │  │    Redis     │  │  DO Spaces (S3)  │    │
│  │    7.0     │  │     7.0      │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        SERVICES                              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   A1111    │  │ ElevenLabs   │  │     FFmpeg       │    │
│  │   ComfyUI  │  │    Bark      │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   PM2      │  │    Nginx     │  │  Let's Encrypt   │    │
│  │  Node 20   │  │    Ubuntu    │  │   DigitalOcean   │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

This complete architecture documentation provides visual representation of the entire system!
