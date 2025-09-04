const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const Syllabus = require('../models/Syllabus');
const router = express.Router();

// @route   POST /api/ml/feedback
// @desc    Submit prediction feedback for model improvement
// @access  Private
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { 
      prediction_id,
      actual_outcome, // 'safe' | 'not_safe'
      user_rating, // 1-5 rating of prediction accuracy
      comments,
      factors
    } = req.body;

    // Here you would store feedback in a database
    // For now, we'll just return success

    // In a real implementation, you would:
    // 1. Store feedback in a database
    // 2. Trigger model retraining if enough feedback is collected
    // 3. Update model performance metrics

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback_id: `fb_${Date.now()}`,
        status: 'received'
      }
    });

  } catch (error) {
    console.error('ML feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// @route   POST /api/ml/retrain
// @desc    Trigger model retraining (admin only)
// @access  Private
router.post('/retrain', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you would:
    // 1. Check if user has admin privileges
    // 2. Collect all feedback data
    // 3. Retrain the model with new data
    // 4. Update the model file
    

    res.json({
      success: true,
      message: 'Model retraining initiated',
      data: {
        retrain_id: `rt_${Date.now()}`,
        status: 'queued',
        estimated_time: '5-10 minutes'
      }
    });

  } catch (error) {
    console.error('ML retrain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate retraining'
    });
  }
});

// @route   GET /api/ml/model-info
// @desc    Get ML model information and performance metrics
// @access  Private
router.get('/model-info', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you would fetch this from the ML service
    const modelInfo = {
      model_type: 'Logistic Regression',
      version: '1.0.0',
      last_trained: '2024-08-31T21:30:00Z',
      training_samples: 1000,
      test_accuracy: 0.765,
      cross_validation_score: 0.756,
      auc_score: 0.785,
      features: [
        'attendance_normalized',
        'exam_urgency',
        'syllabus_normalized',
        'performance_normalized',
        'attendance_syllabus_interaction',
        'exam_preparation_score'
      ],
      feature_importance: {
        'attendance_syllabus_interaction': 1.0086,
        'exam_preparation_score': 0.4267,
        'attendance_normalized': 0.3759,
        'performance_normalized': 0.2141,
        'exam_urgency': -0.4284,
        'syllabus_normalized': -0.7126
      },
      prediction_classes: ['Not Safe', 'Moderate Risk', 'Safe to Bunk'],
      confidence_thresholds: {
        'safe': 0.7,
        'moderate': 0.4,
        'not_safe': 0.0
      }
    };

    res.json({
      success: true,
      data: modelInfo
    });

  } catch (error) {
    console.error('ML model info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get model information'
    });
  }
});

// @route   GET /api/ml/feature-importance
// @desc    Get personalized feature importance based on user's actual data
// Feature importance endpoint
router.get('/feature-importance', authenticateToken, async (req, res) => {
  try {
    
    // Fetch user data - handle undefined user
    if (!req.user || !req.user.userId) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userId = req.user.userId;
    const attendanceRecords = await Attendance.find({ userId });
    const examRecords = await Exam.find({ userId });
    const syllabusRecords = await Syllabus.find({ userId });
    
    
    // Calculate attendance percentage - ALWAYS use real data
    const totalClasses = attendanceRecords.length;
    const presentClasses = attendanceRecords.filter(record => record.present).length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
    
    // Find upcoming exams - ALWAYS use real data
    const currentDate = new Date();
    const upcomingExams = examRecords.filter(exam => new Date(exam.examDate) > currentDate);
    const nextExam = upcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate))[0];
    
    // Calculate days until next exam - ALWAYS use real data
    let daysUntilExam = null;
    if (nextExam) {
      const timeDiff = new Date(nextExam.examDate) - currentDate;
      daysUntilExam = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }
    
    // Calculate syllabus completion - ALWAYS use real data
    const totalSyllabusItems = syllabusRecords.length;
    const completedSyllabusItems = syllabusRecords.filter(item => item.completed).length;
    const syllabusCompletion = totalSyllabusItems > 0 ? (completedSyllabusItems / totalSyllabusItems) * 100 : 0;
    
    
    // Calculate safety scores based on real data - handle null values properly
    const attendanceSafety = attendancePercentage;
    const examSafety = daysUntilExam ? Math.max(0, Math.min(100, (daysUntilExam / 30) * 100)) : 0;
    const syllabusSafety = syllabusCompletion;
    const overallSafety = (attendanceSafety + examSafety + syllabusSafety) / 3;
    
    // Create insights based on real data
    const insights = [
      {
        name: 'Attendance Pattern',
        safetyPercentage: Math.round(attendanceSafety),
        impact: attendanceSafety > 80 ? 'high_positive' : 
                attendanceSafety > 60 ? 'moderate_positive' : 'low_positive',
        description: `Your ${attendancePercentage.toFixed(1)}% attendance (${presentClasses}/${totalClasses} classes) ${attendanceSafety > 75 ? 'is helping you stay safe' : 'puts you at risk'}`,
        recommendation: attendanceSafety > 75 ? 'Keep it up! You can afford to bunk occasionally' : 'Attend more classes before bunking',
        icon: '📚'
      },
      {
        name: 'Exam Timing',
        safetyPercentage: Math.round(examSafety),
        impact: examSafety < 30 ? 'high_negative' : 
                examSafety < 60 ? 'moderate_negative' : 'low_negative',
        description: `${daysUntilExam || 'No upcoming'} ${daysUntilExam ? 'days until' : ''} ${nextExam ? nextExam.subject : 'exams'} ${daysUntilExam && examSafety < 50 ? 'creates pressure' : daysUntilExam ? 'gives you time' : 'scheduled'}`,
        recommendation: examSafety < 50 ? 'Too close to exam - risky to bunk' : 'Enough time to recover if needed',
        icon: '⏰'
      },
      {
        name: 'Syllabus Progress',
        safetyPercentage: Math.round(syllabusSafety),
        impact: syllabusSafety > 70 ? 'high_positive' : 
                syllabusSafety > 40 ? 'moderate_positive' : 'low_positive',
        description: `${syllabusCompletion.toFixed(1)}% syllabus completed (${completedSyllabusItems}/${totalSyllabusItems} topics) ${syllabusSafety > 50 ? 'gives you confidence' : 'needs more work'}`,
        recommendation: syllabusSafety > 50 ? 'Great preparation level!' : 'Complete more topics before bunking',
        icon: '📖'
      },
      {
        name: 'Overall Preparation',
        safetyPercentage: Math.round(overallSafety),
        impact: overallSafety > 60 ? 'moderate_positive' : 
                overallSafety > 30 ? 'low_positive' : 'neutral',
        description: `Combined analysis of all factors ${overallSafety > 50 ? 'looks favorable' : 'needs attention'}`,
        recommendation: overallSafety > 50 ? 'You\'re well-prepared for bunking' : 'Focus on studies before bunking',
        icon: '🎯'
      }
    ];
    
    const summary = {
      overall_safety: Math.round(overallSafety),
      top_strength: attendanceSafety > Math.max(examSafety, syllabusSafety) ? 'Attendance Pattern' : 
                   syllabusSafety > examSafety ? 'Syllabus Progress' : 'Exam Timing',
      main_concern: attendanceSafety < 50 ? 'Attendance Pattern' : 
                   syllabusSafety < 50 ? 'Syllabus Progress' : 
                   examSafety < 50 ? 'Exam Timing' : 'All factors look good',
      quick_advice: overallSafety > 70 ? 'You\'re in good shape to bunk occasionally!' : 
                   overallSafety > 50 ? 'Moderate risk - proceed with caution' : 'Focus on improvement first'
    };
    
    const actionable_tips = [
      attendancePercentage < 75 ? 'Attend next few classes to boost safety' : null,
      syllabusCompletion < 50 ? 'Complete more syllabus topics' : null,
      daysUntilExam < 7 ? 'Consider postponing bunk until after exam' : null,
      'Check your prediction score before making final decision'
    ].filter(tip => tip !== null);
    
    const responseData = {
      insights,
      summary,
      actionable_tips
    };
    
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('❌ Feature importance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating feature importance',
      error: error.message
    });
  }
});

module.exports = router;
