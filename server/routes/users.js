const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'department', 'semester', 'profilePicture', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Validate semester if provided
    if (updates.semester && (updates.semester < 1 || updates.semester > 8)) {
      return res.status(400).json({
        success: false,
        message: 'Semester must be between 1 and 8'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @route   GET /api/users/dashboard-stats
// @desc    Get dashboard statistics for user
// @access  Private
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Import models here to avoid circular dependency
    const Attendance = require('../models/Attendance');
    const Exam = require('../models/Exam');
    const Syllabus = require('../models/Syllabus');

    // Get current semester and academic year
    const currentSemester = req.user.semester || 1;
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    // Get attendance summary
    const attendanceStats = await Attendance.getAttendanceSummary(userId, currentSemester);
    
    // Get upcoming exams (next 30 days)
    const upcomingExams = await Exam.getUpcomingExams(userId, 30);
    
    // Get syllabus completion
    const syllabusStats = await Syllabus.getCompletionPercentage(userId, null, currentSemester);
    
    // Get pending high priority topics
    const pendingTopics = await Syllabus.getPendingHighPriorityTopics(userId, 5);

    // Calculate overall attendance percentage
    const overallAttendance = attendanceStats.reduce((acc, subject) => {
      acc.totalClasses += subject.totalClasses;
      acc.attendedClasses += subject.attendedClasses;
      return acc;
    }, { totalClasses: 0, attendedClasses: 0 });

    const overallAttendancePercentage = overallAttendance.totalClasses > 0 
      ? Math.round((overallAttendance.attendedClasses / overallAttendance.totalClasses) * 100)
      : 0;

    // Calculate overall syllabus completion
    const overallSyllabusCompletion = syllabusStats.reduce((acc, subject) => {
      acc.totalTopics += subject.totalTopics;
      acc.completedTopics += subject.completedTopics;
      return acc;
    }, { totalTopics: 0, completedTopics: 0 });

    const overallSyllabusPercentage = overallSyllabusCompletion.totalTopics > 0
      ? Math.round((overallSyllabusCompletion.completedTopics / overallSyllabusCompletion.totalTopics) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          overallAttendancePercentage,
          overallSyllabusPercentage,
          upcomingExamsCount: upcomingExams.length,
          pendingHighPriorityTopics: pendingTopics.length
        },
        attendance: {
          subjects: attendanceStats,
          overall: {
            percentage: overallAttendancePercentage,
            totalClasses: overallAttendance.totalClasses,
            attendedClasses: overallAttendance.attendedClasses
          }
        },
        exams: {
          upcoming: upcomingExams.slice(0, 5), // Show only next 5 exams
          total: upcomingExams.length
        },
        syllabus: {
          subjects: syllabusStats,
          overall: {
            percentage: overallSyllabusPercentage,
            totalTopics: overallSyllabusCompletion.totalTopics,
            completedTopics: overallSyllabusCompletion.completedTopics
          },
          pendingHighPriority: pendingTopics
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics'
    });
  }
});

// @route   GET /api/users (Admin only)
// @desc    Get all users
// @access  Private (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

// @route   GET /api/users/:id (Admin only)
// @desc    Get user by ID
// @access  Private (Admin)
router.get('/:id', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// @route   PUT /api/users/:id (Admin only)
// @desc    Update user by ID
// @access  Private (Admin)
router.put('/:id', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'email', 'role', 'studentId', 'department', 'semester', 'isActive'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Check if email is being changed and if it's already taken
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if student ID is being changed and if it's already taken
    if (updates.studentId) {
      const existingStudentId = await User.findOne({ 
        studentId: updates.studentId, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/users/:id (Admin only)
// @desc    Delete user by ID
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;
