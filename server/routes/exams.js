const express = require('express');
const Exam = require('../models/Exam');
const { authenticateToken } = require('../middleware/auth');
const { validateExam, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/exams
// @desc    Get exams
// @access  Private
router.get('/', authenticateToken, validatePagination, validateDateRange, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { subject, examType, status, semester, startDate, endDate, sort = 'date' } = req.query;
    
    // Build query
    const query = { userId };
    if (subject) query.subject = new RegExp(subject, 'i');
    if (examType) query.examType = examType;
    if (status) query.status = status;
    if (semester) query.semester = parseInt(semester);
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const exams = await Exam.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email studentId');

    const total = await Exam.countDocuments(query);

    res.json({
      success: true,
      data: {
        exams,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exams'
    });
  }
});

// @route   GET /api/exams/upcoming
// @desc    Get upcoming exams
// @access  Private
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    
    const upcomingExams = await Exam.getUpcomingExams(userId, days);
    
    res.json({
      success: true,
      data: {
        exams: upcomingExams,
        count: upcomingExams.length
      }
    });

  } catch (error) {
    console.error('Get upcoming exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming exams'
    });
  }
});

// @route   GET /api/exams/performance
// @desc    Get exam performance analytics
// @access  Private
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { semester } = req.query;
    
    const performance = await Exam.getPerformanceAnalytics(userId, semester ? parseInt(semester) : null);
    
    res.json({
      success: true,
      data: {
        performance
      }
    });

  } catch (error) {
    console.error('Get exam performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exam performance'
    });
  }
});

// @route   GET /api/exams/:id
// @desc    Get exam by ID
// @access  Private
router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      data: {
        exam
      }
    });

  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exam'
    });
  }
});

// @route   POST /api/exams
// @desc    Create new exam
// @access  Private
router.post('/', authenticateToken, validateExam, async (req, res) => {
  try {
    const examData = {
      ...req.body,
      userId: req.user._id
    };

    const exam = new Exam(examData);
    await exam.save();

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: {
        exam
      }
    });

  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam'
    });
  }
});

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private
router.put('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const allowedUpdates = [
      'subject', 'subjectCode', 'examType', 'title', 'date', 'duration',
      'totalMarks', 'obtainedMarks', 'syllabus', 'location', 'instructions',
      'isImportant'
    ];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: {
        exam
      }
    });

  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam'
    });
  }
});

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private
router.delete('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });

  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam'
    });
  }
});

// @route   POST /api/exams/:id/syllabus
// @desc    Add syllabus topic to exam
// @access  Private
router.post('/:id/syllabus', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { topic, weightage } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    exam.syllabus.push({
      topic,
      weightage: weightage || 5,
      isCompleted: false
    });

    await exam.save();

    res.json({
      success: true,
      message: 'Syllabus topic added successfully',
      data: {
        exam
      }
    });

  } catch (error) {
    console.error('Add syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add syllabus topic'
    });
  }
});

// @route   PUT /api/exams/:id/syllabus/:topicId
// @desc    Update syllabus topic completion status
// @access  Private
router.put('/:id/syllabus/:topicId', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { isCompleted } = req.body;

    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const topic = exam.syllabus.id(req.params.topicId);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    topic.isCompleted = isCompleted;
    await exam.save();

    res.json({
      success: true,
      message: 'Syllabus topic updated successfully',
      data: {
        exam
      }
    });

  } catch (error) {
    console.error('Update syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update syllabus topic'
    });
  }
});

module.exports = router;
