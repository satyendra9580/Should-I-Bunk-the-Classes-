const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  isPresent: {
    type: Boolean,
    required: true
  },
  classType: {
    type: String,
    enum: ['lecture', 'tutorial', 'practical', 'seminar'],
    default: 'lecture'
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  topic: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
attendanceSchema.index({ userId: 1, subject: 1, date: -1 });
attendanceSchema.index({ userId: 1, semester: 1, academicYear: 1 });
attendanceSchema.index({ date: -1 });

// Virtual for attendance percentage calculation
attendanceSchema.virtual('attendanceStats', {
  ref: 'Attendance',
  localField: 'userId',
  foreignField: 'userId'
});

// Static method to calculate attendance percentage
attendanceSchema.statics.calculateAttendancePercentage = async function(userId, subject = null, semester = null) {
  const matchConditions = { userId };
  
  if (subject) matchConditions.subject = subject;
  if (semester) matchConditions.semester = semester;
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: subject ? null : '$subject',
        totalClasses: { $sum: 1 },
        attendedClasses: {
          $sum: { $cond: ['$isPresent', 1, 0] }
        }
      }
    },
    {
      $project: {
        subject: '$_id',
        totalClasses: 1,
        attendedClasses: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$attendedClasses', '$totalClasses'] },
            100
          ]
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get attendance summary
attendanceSchema.statics.getAttendanceSummary = async function(userId, semester = null) {
  const matchConditions = { userId };
  if (semester) matchConditions.semester = semester;
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: {
          subject: '$subject',
          subjectCode: '$subjectCode'
        },
        totalClasses: { $sum: 1 },
        attendedClasses: {
          $sum: { $cond: ['$isPresent', 1, 0] }
        },
        lastAttended: { $max: '$date' },
        classTypes: { $addToSet: '$classType' }
      }
    },
    {
      $project: {
        subject: '$_id.subject',
        subjectCode: '$_id.subjectCode',
        totalClasses: 1,
        attendedClasses: 1,
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$attendedClasses', '$totalClasses'] },
                100
              ]
            },
            2
          ]
        },
        lastAttended: 1,
        classTypes: 1,
        canBunk: {
          $gte: [
            {
              $multiply: [
                { $divide: ['$attendedClasses', '$totalClasses'] },
                100
              ]
            },
            75
          ]
        }
      }
    },
    { $sort: { subject: 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// Method to check if user can bunk next class
attendanceSchema.statics.canBunkNextClass = async function(userId, subject) {
  const stats = await this.calculateAttendancePercentage(userId, subject);
  
  if (stats.length === 0) return { canBunk: false, reason: 'No attendance data found' };
  
  const { totalClasses, attendedClasses, attendancePercentage } = stats[0];
  
  // Calculate attendance if next class is bunked
  const newAttendancePercentage = (attendedClasses / (totalClasses + 1)) * 100;
  
  return {
    canBunk: newAttendancePercentage >= 75,
    currentPercentage: attendancePercentage,
    newPercentage: newAttendancePercentage,
    reason: newAttendancePercentage >= 75 
      ? 'Safe to bunk - attendance will remain above 75%'
      : 'Not safe to bunk - attendance will drop below 75%'
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
