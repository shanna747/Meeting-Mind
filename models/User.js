const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  subscription: {
    type: String,
    enum: ['free', 'pro', 'business'],
    default: 'free'
  },
  dataSources: {
    documentation: {
      type: mongoose.Schema.Types.Mixed,
      default: { connected: false }
    },
    slack: {
      type: mongoose.Schema.Types.Mixed,
      default: { connected: false }
    },
    googleSheets: {
      type: mongoose.Schema.Types.Mixed,
      default: { connected: false }
    },
    notion: {
      type: mongoose.Schema.Types.Mixed,
      default: { connected: false }
    },
    confluence: {
      type: mongoose.Schema.Types.Mixed,
      default: { connected: false }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add method to get subscription limits
userSchema.methods.getSubscriptionLimits = function() {
  const limits = {
    free: {
      meetingDuration: 15,
      monthlyMeetings: 10,
      features: ['basic_transcription', 'company_brain', 'integrations']
    },
    pro: {
      meetingDuration: 30,
      monthlyMeetings: 50,
      features: ['advanced_transcription', 'company_brain', 'integrations', 'priority_support']
    },
    business: {
      meetingDuration: 60,
      monthlyMeetings: -1,
      features: ['premium_transcription', 'company_brain', 'integrations', 'priority_support', 'custom_features']
    }
  };

  return limits[this.subscription] || limits.free;
};

// Add virtual property for 'id' to match the old in-memory implementation
userSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Ensure virtuals are included when converting to JSON/Object
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Add method to sanitize user object (remove sensitive data)
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;

  // Add subscription limits to the safe object
  obj.subscriptionLimits = this.getSubscriptionLimits();

  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
