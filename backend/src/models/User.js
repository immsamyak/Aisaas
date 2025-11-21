import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: false // Optional for OAuth users
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  credits: {
    type: Number,
    default: 3 // Free users get 3 videos
  },
  usage: {
    videosGenerated: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    lastGeneratedAt: Date
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'none'],
      default: 'none'
    },
    currentPeriodEnd: Date
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    defaultVoice: {
      type: String,
      default: 'default'
    },
    defaultStyle: {
      type: String,
      default: 'realistic'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
userSchema.index({ email: 1, isActive: 1 });

// Method to check if user has credits
userSchema.methods.hasCredits = function() {
  return this.credits > 0 || this.plan !== 'free';
};

// Method to deduct credits
userSchema.methods.deductCredit = async function() {
  if (this.plan === 'free' && this.credits > 0) {
    this.credits -= 1;
  }
  this.usage.videosGenerated += 1;
  this.usage.lastGeneratedAt = new Date();
  await this.save();
};

// Method to add credits
userSchema.methods.addCredits = async function(amount) {
  this.credits += amount;
  await this.save();
};

// Virtual for plan display name
userSchema.virtual('planName').get(function() {
  const plans = {
    free: 'Free Plan',
    pro: 'Pro Plan',
    enterprise: 'Enterprise Plan'
  };
  return plans[this.plan] || 'Unknown';
});

const User = mongoose.model('User', userSchema);

export default User;
