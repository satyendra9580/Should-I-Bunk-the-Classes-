const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true
  },
  chapter: {
    type: String,
    trim: true
  },
  unit: {
    type: Number,
    min: 1
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  estimatedHours: {
    type: Number,
    min: 0,
    default: 2
  },
  actualHours: {
    type: Number,
    min: 0
  },
  resources: [{
    type: {
      type: String,
      enum: ['book', 'video', 'article', 'website', 'notes', 'other'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    url: String,
    author: String,
    pages: String,
    notes: String
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true
  },
  weightage: {
    type: Number,
    min: 0,
    max: 100,
    default: 5
  },
  examRelevance: {
    type: String,
    enum: ['not-relevant', 'low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  lastReviewed: {
    type: Date
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
syllabusSchema.index({ userId: 1, subject: 1 });
syllabusSchema.index({ userId: 1, semester: 1, academicYear: 1 });
syllabusSchema.index({ isCompleted: 1, priority: 1 });
syllabusSchema.index({ tags: 1 });

// Pre-save middleware to set completed date
syllabusSchema.pre('save', function(next) {
  if (this.isModified('isCompleted')) {
    if (this.isCompleted && !this.completedDate) {
      this.completedDate = new Date();
    } else if (!this.isCompleted) {
      this.completedDate = undefined;
    }
  }
  next();
});

// Virtual for completion status
syllabusSchema.virtual('completionStatus').get(function() {
  if (this.isCompleted) return 'completed';
  
  const now = new Date();
  const daysSinceCreated = Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
  
  if (daysSinceCreated > 30) return 'overdue';
  if (daysSinceCreated > 14) return 'pending';
  return 'on-track';
});

// Static method to get syllabus completion percentage
syllabusSchema.statics.getCompletionPercentage = async function(userId, subject = null, semester = null) {
  const matchConditions = { userId };
  
  if (subject) matchConditions.subject = subject;
  if (semester) matchConditions.semester = semester;
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: subject ? null : '$subject',
        totalTopics: { $sum: 1 },
        completedTopics: {
          $sum: { $cond: ['$isCompleted', 1, 0] }
        },
        totalWeightage: { $sum: '$weightage' },
        completedWeightage: {
          $sum: { $cond: ['$isCompleted', '$weightage', 0] }
        }
      }
    },
    {
      $project: {
        subject: '$_id',
        totalTopics: 1,
        completedTopics: 1,
        completionPercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$completedTopics', '$totalTopics'] },
                100
              ]
            },
            2
          ]
        },
        weightedCompletionPercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$completedWeightage', '$totalWeightage'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get pending high-priority topics
syllabusSchema.statics.getPendingHighPriorityTopics = async function(userId, limit = 10) {
  return await this.find({
    userId,
    isCompleted: false,
    priority: { $in: ['high', 'critical'] }
  })
  .sort({ priority: -1, createdAt: 1 })
  .limit(limit);
};

// Static method to get syllabus analytics
syllabusSchema.statics.getSyllabusAnalytics = async function(userId, semester = null) {
  const matchConditions = { userId };
  if (semester) matchConditions.semester = semester;
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$subject',
        totalTopics: { $sum: 1 },
        completedTopics: {
          $sum: { $cond: ['$isCompleted', 1, 0] }
        },
        highPriorityPending: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isCompleted', false] }, { $in: ['$priority', ['high', 'critical']] }] },
              1,
              0
            ]
          }
        },
        averageDifficulty: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ['$difficulty', 'easy'] }, then: 1 },
                { case: { $eq: ['$difficulty', 'medium'] }, then: 2 },
                { case: { $eq: ['$difficulty', 'hard'] }, then: 3 }
              ],
              default: 2
            }
          }
        },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    },
    {
      $project: {
        subject: '$_id',
        totalTopics: 1,
        completedTopics: 1,
        completionPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$completedTopics', '$totalTopics'] }, 100] },
            2
          ]
        },
        highPriorityPending: 1,
        averageDifficulty: { $round: ['$averageDifficulty', 1] },
        totalEstimatedHours: 1,
        totalActualHours: 1,
        efficiencyRatio: {
          $cond: [
            { $gt: ['$totalActualHours', 0] },
            { $round: [{ $divide: ['$totalEstimatedHours', '$totalActualHours'] }, 2] },
            null
          ]
        }
      }
    },
    { $sort: { completionPercentage: 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// Method to mark as reviewed
syllabusSchema.methods.markAsReviewed = function() {
  this.lastReviewed = new Date();
  this.reviewCount += 1;
  return this.save();
};

// Static method to get topics for revision (based on spaced repetition)
syllabusSchema.statics.getTopicsForRevision = async function(userId) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return await this.find({
    userId,
    isCompleted: true,
    $or: [
      { lastReviewed: { $exists: false } },
      { lastReviewed: { $lt: oneWeekAgo }, reviewCount: { $lt: 3 } },
      { lastReviewed: { $lt: twoWeeksAgo }, reviewCount: { $lt: 5 } },
      { lastReviewed: { $lt: oneMonthAgo } }
    ]
  })
  .sort({ priority: -1, lastReviewed: 1 })
  .limit(20);
};

module.exports = mongoose.model('Syllabus', syllabusSchema);
