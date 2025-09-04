const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
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
  examType: {
    type: String,
    enum: ['quiz', 'midterm', 'final', 'assignment', 'project', 'viva'],
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: function() {
      return `${this.examType.charAt(0).toUpperCase() + this.examType.slice(1)} - ${this.subject}`;
    }
  },
  date: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  duration: {
    type: Number, // in minutes
    default: 180
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  obtainedMarks: {
    type: Number,
    min: 0,
    default: null,
    validate: {
      validator: function(v) {
        return v == null || v <= this.totalMarks;
      },
      message: 'Obtained marks cannot exceed total marks'
    }
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    uppercase: true
  },
  syllabus: [{
    topic: {
      type: String,
      required: true
    },
    weightage: {
      type: Number,
      min: 0,
      max: 100
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  location: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
    default: 1
  },
  academicYear: {
    type: String,
    default: function() {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
examSchema.index({ userId: 1, date: 1 });
examSchema.index({ userId: 1, subject: 1 });
examSchema.index({ date: 1, status: 1 });
examSchema.index({ userId: 1, semester: 1, academicYear: 1 });

// Pre-save middleware to calculate percentage and grade
examSchema.pre('save', function(next) {
  if (this.obtainedMarks != null && this.totalMarks > 0) {
    this.percentage = Math.round((this.obtainedMarks / this.totalMarks) * 100 * 100) / 100;
    
    // Calculate grade based on percentage
    if (this.percentage >= 90) this.grade = 'A+';
    else if (this.percentage >= 80) this.grade = 'A';
    else if (this.percentage >= 70) this.grade = 'B+';
    else if (this.percentage >= 60) this.grade = 'B';
    else if (this.percentage >= 50) this.grade = 'C+';
    else if (this.percentage >= 40) this.grade = 'C';
    else if (this.percentage >= 33) this.grade = 'D';
    else this.grade = 'F';
  }
  
  // Update status based on date
  const now = new Date();
  const examDate = new Date(this.date);
  const examEndTime = new Date(examDate.getTime() + (this.duration * 60000));
  
  if (now < examDate) {
    this.status = 'upcoming';
  } else if (now >= examDate && now <= examEndTime) {
    this.status = 'ongoing';
  } else if (this.obtainedMarks != null) {
    this.status = 'completed';
  }
  
  next();
});

// Virtual for days until exam
examSchema.virtual('daysUntilExam').get(function() {
  const now = new Date();
  const examDate = new Date(this.date);
  const diffTime = examDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for syllabus completion percentage
examSchema.virtual('syllabusCompletionPercentage').get(function() {
  if (!this.syllabus || this.syllabus.length === 0) return 0;
  
  const completedTopics = this.syllabus.filter(topic => topic.isCompleted).length;
  return Math.round((completedTopics / this.syllabus.length) * 100);
});

// Static method to get upcoming exams
examSchema.statics.getUpcomingExams = async function(userId, days = 30) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return await this.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
    status: 'upcoming'
  }).sort({ date: 1 });
};

// Static method to get exam performance analytics
examSchema.statics.getPerformanceAnalytics = async function(userId, semester = null) {
  const matchConditions = { 
    userId, 
    status: 'completed',
    obtainedMarks: { $ne: null }
  };
  
  if (semester) matchConditions.semester = semester;
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$subject',
        averagePercentage: { $avg: '$percentage' },
        totalExams: { $sum: 1 },
        highestScore: { $max: '$percentage' },
        lowestScore: { $min: '$percentage' },
        totalMarks: { $sum: '$obtainedMarks' },
        maxPossibleMarks: { $sum: '$totalMarks' }
      }
    },
    {
      $project: {
        subject: '$_id',
        averagePercentage: { $round: ['$averagePercentage', 2] },
        totalExams: 1,
        highestScore: 1,
        lowestScore: 1,
        overallPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$totalMarks', '$maxPossibleMarks'] }, 100] },
            2
          ]
        }
      }
    },
    { $sort: { averagePercentage: -1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// Method to calculate exam proximity score (for ML model)
examSchema.methods.getProximityScore = function() {
  const daysUntil = this.daysUntilExam;
  
  if (daysUntil < 0) return 0; // Exam already passed
  if (daysUntil === 0) return 1; // Exam today
  if (daysUntil <= 3) return 0.9;
  if (daysUntil <= 7) return 0.7;
  if (daysUntil <= 14) return 0.5;
  if (daysUntil <= 30) return 0.3;
  return 0.1; // Exam far away
};

module.exports = mongoose.model('Exam', examSchema);
