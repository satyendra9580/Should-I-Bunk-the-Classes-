const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['student', 'admin'])
    .withMessage('Role must be either student or admin'),
  body('studentId')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Student ID must be between 3 and 20 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters'),
  body('semester')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Attendance validation
const validateAttendance = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('subjectCode')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('isPresent')
    .isBoolean()
    .withMessage('isPresent must be a boolean value'),
  body('classType')
    .optional()
    .isIn(['lecture', 'tutorial', 'practical', 'seminar'])
    .withMessage('Invalid class type'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('academicYear')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  handleValidationErrors
];

// Exam validation
const validateExam = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('subjectCode')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required'),
  body('examType')
    .isIn(['quiz', 'midterm', 'final', 'assignment', 'project', 'viva'])
    .withMessage('Invalid exam type'),
  body('title')
    .optional()
    .trim(),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 and 480 minutes'),
  body('totalMarks')
    .isFloat({ min: 0 })
    .withMessage('Total marks must be a positive number'),
  body('obtainedMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Obtained marks must be a positive number'),
  body('semester')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('academicYear')
    .optional()
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  handleValidationErrors
];

// Syllabus validation
const validateSyllabus = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('subjectCode')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required'),
  body('topic')
    .trim()
    .notEmpty()
    .withMessage('Topic is required'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('academicYear')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be in format YYYY-YYYY'),
  body('weightage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Weightage must be between 0 and 100'),
  handleValidationErrors
];

// ID parameter validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Query parameter validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['date', '-date', 'subject', '-subject', 'createdAt', '-createdAt'])
    .withMessage('Invalid sort parameter'),
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAttendance,
  validateExam,
  validateSyllabus,
  validateObjectId,
  validatePagination,
  validateDateRange,
  handleValidationErrors
};
