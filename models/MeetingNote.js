const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  answered: {
    type: Boolean,
    default: false
  },
  answer: {
    type: String,
    default: ''
  },
  sourceDocument: {
    type: String,
    default: ''
  },
  needsDocumentation: {
    type: Boolean,
    default: false
  }
});

const meetingNoteSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Meeting Session'
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  questions: [questionSchema],
  summary: {
    totalQuestions: {
      type: Number,
      default: 0
    },
    answeredQuestions: {
      type: Number,
      default: 0
    },
    unansweredQuestions: {
      type: Number,
      default: 0
    },
    needsDocumentation: {
      type: Number,
      default: 0
    }
  },
  transcript: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Method to add a question
meetingNoteSchema.methods.addQuestion = function(questionData) {
  this.questions.push(questionData);
  this.updateSummary();
};

// Method to update summary statistics
meetingNoteSchema.methods.updateSummary = function() {
  this.summary.totalQuestions = this.questions.length;
  this.summary.answeredQuestions = this.questions.filter(q => q.answered).length;
  this.summary.unansweredQuestions = this.questions.filter(q => !q.answered).length;
  this.summary.needsDocumentation = this.questions.filter(q => q.needsDocumentation).length;
};

// Method to complete the meeting
meetingNoteSchema.methods.completeMeeting = function() {
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  this.status = 'completed';
  this.updateSummary();
};

const MeetingNote = mongoose.model('MeetingNote', meetingNoteSchema);

module.exports = MeetingNote;
