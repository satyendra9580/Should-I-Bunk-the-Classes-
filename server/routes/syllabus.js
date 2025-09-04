const express = require('express');
const Syllabus = require('../models/Syllabus');
const { authenticateToken } = require('../middleware/auth');
const { validateSyllabus, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/syllabus
// @desc    Get syllabus topics
// @access  Private
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { subject, semester, isCompleted, priority, difficulty, sort = 'createdAt' } = req.query;
    
    // Build query
    const query = { userId };
    if (subject) query.subject = new RegExp(subject, 'i');
    if (semester) query.semester = parseInt(semester);
    if (isCompleted !== undefined) query.isCompleted = isCompleted === 'true';
    if (priority) query.priority = priority;
    if (difficulty) query.difficulty = difficulty;

    const syllabus = await Syllabus.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email studentId');

    const total = await Syllabus.countDocuments(query);

    res.json({
      success: true,
      data: {
        syllabus,
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
    console.error('Get syllabus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get syllabus topics'
    });
  }
});

// @route   GET /api/syllabus/completion
// @desc    Get syllabus completion percentage
// @access  Private
router.get('/completion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject, semester } = req.query;
    
    const completion = await Syllabus.getCompletionPercentage(
      userId, 
      subject, 
      semester ? parseInt(semester) : null
    );
    
    res.json({
      success: true,
      data: {
        completion
      }
    });

  } catch (error) {
    console.error('Get syllabus completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get syllabus completion'
    });
  }
});

// @route   GET /api/syllabus/pending-priority
// @desc    Get pending high-priority topics
// @access  Private
router.get('/pending-priority', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    const topics = await Syllabus.getPendingHighPriorityTopics(userId, limit);
    
    res.json({
      success: true,
      data: {
        topics,
        count: topics.length
      }
    });

  } catch (error) {
    console.error('Get pending priority topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending priority topics'
    });
  }
});

// @route   GET /api/syllabus/analytics
// @desc    Get syllabus analytics
// @access  Private
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { semester } = req.query;
    
    const analytics = await Syllabus.getSyllabusAnalytics(userId, semester ? parseInt(semester) : null);
    
    res.json({
      success: true,
      data: {
        analytics
      }
    });

  } catch (error) {
    console.error('Get syllabus analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get syllabus analytics'
    });
  }
});

// @route   GET /api/syllabus/revision
// @desc    Get topics for revision (spaced repetition)
// @access  Private
router.get('/revision', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const topics = await Syllabus.getTopicsForRevision(userId);
    
    res.json({
      success: true,
      data: {
        topics,
        count: topics.length
      }
    });

  } catch (error) {
    console.error('Get revision topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revision topics'
    });
  }
});

// @route   GET /api/syllabus/:id
// @desc    Get syllabus topic by ID
// @access  Private
router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const topic = await Syllabus.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    res.json({
      success: true,
      data: {
        topic
      }
    });

  } catch (error) {
    console.error('Get syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get syllabus topic'
    });
  }
});

// @route   POST /api/syllabus
// @desc    Create new syllabus topic
// @access  Private
router.post('/', authenticateToken, validateSyllabus, async (req, res) => {
  try {
    const topicData = {
      ...req.body,
      userId: req.user.userId
    };

    const topic = new Syllabus(topicData);
    await topic.save();

    res.status(201).json({
      success: true,
      message: 'Syllabus topic created successfully',
      data: {
        topic
      }
    });

  } catch (error) {
    console.error('Create syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create syllabus topic'
    });
  }
});

// @route   POST /api/syllabus/bulk
// @desc    Create multiple syllabus topics
// @access  Private
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { topics } = req.body;
    
    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Topics array is required'
      });
    }

    // Add userId to each topic
    const syllabusTopics = topics.map(topic => ({
      ...topic,
      userId: req.user.userId
    }));

    const createdTopics = await Syllabus.insertMany(syllabusTopics);

    res.status(201).json({
      success: true,
      message: `${createdTopics.length} syllabus topics created successfully`,
      data: {
        topics: createdTopics,
        count: createdTopics.length
      }
    });

  } catch (error) {
    console.error('Bulk create syllabus topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create syllabus topics'
    });
  }
});

// @route   PUT /api/syllabus/:id
// @desc    Update syllabus topic
// @access  Private
router.put('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const allowedUpdates = [
      'topic', 'chapter', 'unit', 'description', 'isCompleted', 'difficulty',
      'priority', 'estimatedHours', 'actualHours', 'resources', 'tags',
      'weightage', 'examRelevance', 'notes'
    ];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const topic = await Syllabus.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Syllabus topic updated successfully',
      data: {
        topic
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

// @route   PUT /api/syllabus/:id/complete
// @desc    Mark syllabus topic as completed
// @access  Private
router.put('/:id/complete', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const { actualHours } = req.body;

    const topic = await Syllabus.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { 
        isCompleted: true,
        completedDate: new Date(),
        ...(actualHours && { actualHours })
      },
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Syllabus topic marked as completed',
      data: {
        topic
      }
    });

  } catch (error) {
    console.error('Complete syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete syllabus topic'
    });
  }
});

// @route   PUT /api/syllabus/:id/review
// @desc    Mark syllabus topic as reviewed
// @access  Private
router.put('/:id/review', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const topic = await Syllabus.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    await topic.markAsReviewed();

    res.json({
      success: true,
      message: 'Syllabus topic marked as reviewed',
      data: {
        topic
      }
    });

  } catch (error) {
    console.error('Review syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review syllabus topic'
    });
  }
});

// @route   DELETE /api/syllabus/:id
// @desc    Delete syllabus topic
// @access  Private
router.delete('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const topic = await Syllabus.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Syllabus topic deleted successfully'
    });

  } catch (error) {
    console.error('Delete syllabus topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete syllabus topic'
    });
  }
});

module.exports = router;
