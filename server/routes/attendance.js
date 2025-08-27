const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Attendance = require('../models/Attendance');
const { authenticateToken } = require('../middleware/auth');
const { validateAttendance, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// Configure multer for CSV upload
const upload = multer({ dest: 'uploads/' });

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', authenticateToken, validatePagination, validateDateRange, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { subject, semester, startDate, endDate, sort = '-date' } = req.query;
    
    // Build query
    const query = { userId };
    if (subject) query.subject = new RegExp(subject, 'i');
    if (semester) query.semester = parseInt(semester);
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email studentId');

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: {
        attendance,
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
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records'
    });
  }
});

// @route   GET /api/attendance/summary
// @desc    Get attendance summary
// @access  Private
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { semester } = req.query;
    
    const summary = await Attendance.getAttendanceSummary(userId, semester ? parseInt(semester) : null);
    
    res.json({
      success: true,
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance summary'
    });
  }
});

// @route   GET /api/attendance/can-bunk/:subject
// @desc    Check if user can bunk next class for a subject
// @access  Private
router.get('/can-bunk/:subject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject } = req.params;
    
    const result = await Attendance.canBunkNextClass(userId, subject);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Can bunk check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check bunk status'
    });
  }
});

// @route   POST /api/attendance
// @desc    Add attendance record
// @access  Private
router.post('/', authenticateToken, validateAttendance, async (req, res) => {
  try {
    const attendanceData = {
      ...req.body,
      userId: req.user._id
    };

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    res.status(201).json({
      success: true,
      message: 'Attendance record added successfully',
      data: {
        attendance
      }
    });

  } catch (error) {
    console.error('Add attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add attendance record'
    });
  }
});

// @route   POST /api/attendance/bulk
// @desc    Add multiple attendance records
// @access  Private
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required'
      });
    }

    // Add userId to each record
    const attendanceRecords = records.map(record => ({
      ...record,
      userId: req.user._id
    }));

    const attendance = await Attendance.insertMany(attendanceRecords);

    res.status(201).json({
      success: true,
      message: `${attendance.length} attendance records added successfully`,
      data: {
        attendance,
        count: attendance.length
      }
    });

  } catch (error) {
    console.error('Bulk add attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add attendance records'
    });
  }
});

// @route   POST /api/attendance/upload-csv
// @desc    Upload attendance data via CSV
// @access  Private
router.post('/upload-csv', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    console.log('CSV file uploaded:', req.file.filename, 'Size:', req.file.size);

    const results = [];
    const errors = [];
    let responseSet = false;

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          console.log('Processing CSV row:', data);
          
          // Expected CSV format: subject,subjectCode,date,isPresent,classType,semester,academicYear
          const record = {
            userId: req.user._id,
            subject: data.subject?.trim(),
            subjectCode: data.subjectCode?.trim()?.toUpperCase(),
            date: new Date(data.date),
            isPresent: data.isPresent?.toLowerCase() === 'true' || data.isPresent === '1' || data.isPresent?.toLowerCase() === 'yes',
            classType: data.classType?.trim() || 'lecture',
            semester: parseInt(data.semester) || 1,
            academicYear: data.academicYear?.trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            topic: data.topic?.trim() || '',
            notes: data.notes?.trim() || '',
            duration: parseInt(data.duration) || 60
          };

          // Basic validation
          if (!record.subject || !record.subjectCode || isNaN(record.date.getTime())) {
            errors.push(`Invalid record - missing required fields: ${JSON.stringify(data)}`);
            return;
          }

          results.push(record);
        } catch (error) {
          console.error('Error parsing CSV row:', error);
          errors.push(`Error parsing record: ${JSON.stringify(data)} - ${error.message}`);
        }
      })
      .on('end', async () => {
        if (responseSet) return;
        
        try {
          console.log(`CSV parsing complete. Valid records: ${results.length}, Errors: ${errors.length}`);
          
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          if (results.length === 0) {
            responseSet = true;
            return res.status(400).json({
              success: false,
              message: 'No valid records found in CSV',
              errors: errors.slice(0, 10) // Limit error details
            });
          }

          // Insert records
          const attendance = await Attendance.insertMany(results);
          console.log(`Successfully inserted ${attendance.length} attendance records`);

          responseSet = true;
          res.json({
            success: true,
            message: `${attendance.length} attendance records imported successfully`,
            data: {
              imported: attendance.length,
              errors: errors.length,
              errorDetails: errors.slice(0, 5) // Limit error details in response
            }
          });

        } catch (dbError) {
          console.error('CSV import database error:', dbError);
          if (!responseSet) {
            responseSet = true;
            res.status(500).json({
              success: false,
              message: 'Failed to import attendance records',
              error: dbError.message
            });
          }
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (!responseSet) {
          responseSet = true;
          res.status(500).json({
            success: false,
            message: 'Failed to parse CSV file',
            error: error.message
          });
        }
      });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload CSV file',
      error: error.message
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private
router.put('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const allowedUpdates = ['subject', 'subjectCode', 'date', 'isPresent', 'classType', 'duration', 'topic', 'notes'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const attendance = await Attendance.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: {
        attendance
      }
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance record'
    });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Private
router.delete('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const attendance = await Attendance.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance record'
    });
  }
});

// @route   GET /api/attendance/analytics
// @desc    Get attendance analytics
// @access  Private
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { semester } = req.query;
    
    // Get attendance summary
    const summary = await Attendance.getAttendanceSummary(userId, semester ? parseInt(semester) : null);
    
    // Calculate trends and insights
    const analytics = {
      summary,
      insights: {
        totalSubjects: summary.length,
        averageAttendance: summary.length > 0 
          ? Math.round(summary.reduce((acc, s) => acc + s.attendancePercentage, 0) / summary.length)
          : 0,
        subjectsAtRisk: summary.filter(s => s.attendancePercentage < 75).length,
        safeToBunkSubjects: summary.filter(s => s.canBunk).length
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance analytics'
    });
  }
});

module.exports = router;
