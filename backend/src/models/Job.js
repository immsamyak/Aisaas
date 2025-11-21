import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  inputText: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStep: {
    type: String,
    default: 'queued'
  },
  scenes: [{
    sceneIndex: Number,
    text: String,
    imageUrl: String,
    audioUrl: String,
    duration: Number
  }],
  settings: {
    voiceId: {
      type: String,
      default: 'default'
    },
    imageStyle: {
      type: String,
      default: 'realistic'
    },
    musicEnabled: {
      type: Boolean,
      default: true
    },
    subtitlesEnabled: {
      type: Boolean,
      default: true
    }
  },
  videoUrl: {
    type: String,
    default: null
  },
  videoKey: {
    type: String,
    default: null
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: null
  },
  metadata: {
    resolution: {
      type: String,
      default: '1080x1920'
    },
    fps: {
      type: Number,
      default: 30
    },
    fileSize: Number,
    totalScenes: Number
  },
  processingTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Index for efficient queries
jobSchema.index({ createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });

// Virtual for processing duration
jobSchema.virtual('processingDuration').get(function() {
  if (this.completedAt && this.createdAt) {
    return Math.round((this.completedAt - this.createdAt) / 1000);
  }
  return 0;
});

// Method to update progress
jobSchema.methods.updateProgress = async function(progress, step) {
  this.progress = progress;
  this.currentStep = step;
  await this.save();
};

// Method to mark as completed
jobSchema.methods.markCompleted = async function(videoUrl, videoKey) {
  this.status = 'completed';
  this.progress = 100;
  this.videoUrl = videoUrl;
  this.videoKey = videoKey;
  this.completedAt = new Date();
  this.processingTime = Math.round((this.completedAt - this.createdAt) / 1000);
  await this.save();
};

// Method to mark as failed
jobSchema.methods.markFailed = async function(error) {
  this.status = 'failed';
  this.error = error;
  this.completedAt = new Date();
  await this.save();
};

const Job = mongoose.model('Job', jobSchema);

export default Job;
