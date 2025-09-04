const express = require('express');
const axios = require('axios');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const Syllabus = require('../models/Syllabus');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const { generateEnhancedRecommendations } = require('../services/geminiService');

const router = express.Router();

// @route   GET /api/predictions/health
// @desc    Check ML service health
// @access  Private
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5003';
    
    const healthResponse = await axios.get(`${mlServiceUrl}/health`, {
      timeout: 5000
    });
    
    res.json({
      success: true,
      message: 'ML service is healthy',
      data: {
        mlService: {
          status: 'connected',
          url: mlServiceUrl,
          response: healthResponse.data
        },
        backend: {
          status: 'running',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('ML service health check failed:', error.message);
    res.status(503).json({
      success: false,
      message: 'ML service is not available',
      data: {
        mlService: {
          status: 'disconnected',
          url: process.env.ML_SERVICE_URL || 'http://localhost:5003',
          error: error.message
        },
        backend: {
          status: 'running',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
});

// @route   POST /api/predict
// @desc    Get bunk recommendation using ML model
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject, semester } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    // Get current semester if not provided
    const currentSemester = semester || req.user.semester || 1;

    // Gather data for ML model
    const [attendanceStats, upcomingExams, syllabusStats, performanceStats] = await Promise.all([
      Attendance.calculateAttendancePercentage(userId, subject, currentSemester),
      Exam.getUpcomingExams(userId, 30),
      Syllabus.getCompletionPercentage(userId, subject, currentSemester),
      Exam.getPerformanceAnalytics(userId, currentSemester)
    ]);

    // Calculate attendance percentage
    const attendancePercentage = attendanceStats.length > 0 ? attendanceStats[0].attendancePercentage : 0;

    // Find next exam for the subject
    const nextExam = upcomingExams.find(exam => exam.subject === subject);
    const daysUntilExam = nextExam ? Math.ceil((new Date(nextExam.date) - new Date()) / (1000 * 60 * 60 * 24)) : 365;
    const examProximityScore = nextExam ? nextExam.getProximityScore() : 0;

    // Calculate syllabus completion percentage
    const syllabusCompletion = syllabusStats.length > 0 ? syllabusStats[0].completionPercentage : 0;

    // Calculate past performance score
    const subjectPerformance = performanceStats.find(p => p.subject === subject);
    const pastPerformanceScore = subjectPerformance ? subjectPerformance.averagePercentage : 70; // Default to 70%

    // Prepare data for ML service
    const mlData = {
      attendance_percentage: attendancePercentage,
      exam_proximity: examProximityScore,
      syllabus_completion: syllabusCompletion,
      past_performance: pastPerformanceScore,
      days_until_exam: daysUntilExam,
      subject: subject,
      user_id: userId.toString()
    };

    try {
      // Call ML service
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, mlData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const prediction = mlResponse.data;

      // Store prediction for future reference
      const predictionRecord = {
        userId,
        subject,
        semester: currentSemester,
        inputData: mlData,
        prediction: prediction.prediction,
        probability: prediction.confidence,
        factors: prediction.factors,
        timestamp: new Date()
      };

      // You could store this in a Prediction model if needed
      // await Prediction.create(predictionRecord);

      res.json({
        success: true,
        data: {
          recommendation: prediction.prediction,
          probability: prediction.confidence,
          riskLevel: prediction.risk_level,
          factors: prediction.factors,
          explanation: prediction.explanation,
          inputData: {
            attendancePercentage,
            examProximityScore,
            syllabusCompletion,
            pastPerformanceScore,
            daysUntilExam
          },
          nextExam: nextExam ? {
            title: nextExam.title,
            date: nextExam.date,
            daysUntil: daysUntilExam
          } : null
        }
      });

    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      
      // Fallback logic if ML service is unavailable
      const fallbackRecommendation = getFallbackRecommendation({
        attendancePercentage,
        daysUntilExam,
        syllabusCompletion,
        pastPerformanceScore
      });

      res.json({
        success: true,
        data: {
          ...fallbackRecommendation,
          inputData: {
            attendancePercentage,
            examProximityScore,
            syllabusCompletion,
            pastPerformanceScore,
            daysUntilExam
          },
          nextExam: nextExam ? {
            title: nextExam.title,
            date: nextExam.date,
            daysUntil: daysUntilExam
          } : null,
          note: 'ML service unavailable - using fallback logic'
        }
      });
    }

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prediction'
    });
  }
});

// @route   GET /api/predict/batch
// @desc    Get predictions for all subjects
// @access  Private
router.get('/batch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSemester = req.user.semester || 1;

    // Get all subjects for the user
    const attendanceStats = await Attendance.getAttendanceSummary(userId, currentSemester);
    
    const predictions = [];

    for (const subjectStat of attendanceStats) {
      try {
        // Make prediction request for each subject
        const predictionResponse = await axios.post(
          `${req.protocol}://${req.get('host')}/api/predict`,
          { subject: subjectStat.subject, semester: currentSemester },
          {
            headers: {
              'Authorization': req.headers.authorization,
              'Content-Type': 'application/json'
            }
          }
        );

        predictions.push({
          subject: subjectStat.subject,
          ...predictionResponse.data.data
        });
      } catch (error) {
        console.error(`Prediction error for ${subjectStat.subject}:`, error.message);
        
        // Add fallback prediction
        const fallback = getFallbackRecommendation({
          attendancePercentage: subjectStat.attendancePercentage,
          daysUntilExam: 30, // Default
          syllabusCompletion: 50, // Default
          pastPerformanceScore: 70 // Default
        });

        predictions.push({
          subject: subjectStat.subject,
          ...fallback,
          note: 'Fallback prediction'
        });
      }
    }

    res.json({
      success: true,
      data: {
        predictions,
        count: predictions.length
      }
    });

  } catch (error) {
    console.error('Batch prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch predictions'
    });
  }
});

// Fallback recommendation logic
function getFallbackRecommendation({ attendancePercentage, daysUntilExam, syllabusCompletion, pastPerformanceScore }) {
  let recommendation = 'Not Safe';
  let probability = 0;
  let riskLevel = 'high';
  let factors = [];
  let explanation = '';

  // Simple rule-based logic
  if (attendancePercentage < 75) {
    factors.push('Low attendance (below 75%)');
    explanation = 'Your attendance is below the minimum requirement of 75%. Bunking more classes could put you at risk.';
  }

  if (daysUntilExam <= 7) {
    factors.push('Exam is very close (within 7 days)');
    explanation += ' You have an exam coming up soon, attending class could be beneficial for last-minute clarifications.';
  }

  if (syllabusCompletion < 50) {
    factors.push('Low syllabus completion (below 50%)');
    explanation += ' You haven\'t completed much of the syllabus, attending class could help you catch up.';
  }

  // Calculate probability based on factors
  let score = 0;
  if (attendancePercentage >= 80) score += 0.4;
  else if (attendancePercentage >= 75) score += 0.2;

  if (daysUntilExam > 14) score += 0.3;
  else if (daysUntilExam > 7) score += 0.1;

  if (syllabusCompletion >= 70) score += 0.2;
  else if (syllabusCompletion >= 50) score += 0.1;

  if (pastPerformanceScore >= 80) score += 0.1;

  probability = Math.min(score, 1.0);

  if (probability >= 0.7) {
    recommendation = 'Safe to Bunk';
    riskLevel = 'low';
    explanation = 'Based on your good attendance and performance, it should be safe to skip this class.';
  } else if (probability >= 0.4) {
    recommendation = 'Moderate Risk';
    riskLevel = 'medium';
    explanation = 'There\'s some risk in bunking this class. Consider your priorities carefully.';
  }

  if (factors.length === 0) {
    factors.push('Good attendance and performance');
  }

  return {
    recommendation,
    probability: Math.round(probability * 100) / 100,
    riskLevel,
    factors,
    explanation
  };
}

// @route   GET /api/predictions/history
// @desc    Get prediction history for user
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // For now, return empty array since we don't have a Prediction model
    // In production, you would query a Prediction collection
    res.json({
      success: true,
      predictions: []
    });
  } catch (error) {
    console.error('Prediction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction history'
    });
  }
});

// @route   POST /api/predictions
// @desc    Save prediction to history
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const predictionData = req.body;
    
    // For now, just return success
    // In production, you would save to a Prediction collection
    
    res.json({
      success: true,
      message: 'Prediction saved successfully'
    });
  } catch (error) {
    console.error('Save prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save prediction'
    });
  }
});

// @route   POST /api/predictions/ai-recommendations-stream
// @desc    Get enhanced AI recommendations using Gemini AI with streaming
// @access  Private
router.post('/ai-recommendations-stream', authenticateToken, async (req, res) => {
  try {
    const { prediction } = req.body;

    // Validate that we have prediction data
    if (!prediction) {
      return res.status(400).json({
        success: false,
        message: 'Missing required prediction data'
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Extract data from the prediction object
    const academicData = prediction.academicData || {};
    
    // Prepare data for Gemini AI
    const predictionData = {
      attendance_percentage: academicData.attendancePercentage || 0,
      exam_proximity_days: academicData.daysUntilExam || null,
      syllabus_completion: academicData.syllabusCompletion || 0,
      average_marks: academicData.averageMarks || null,
      subject: 'Overall',
      class_type: 'General',
      recommendation: prediction.recommendation || 'Not Safe',
      confidence: Math.round(prediction.confidence * 100) || 0,
      explanation: prediction.explanation || 'Based on your academic data'
    };


    // Simulate streaming by sending the response in chunks
    const streamResponse = async () => {
      try {
        // Get the full response from Gemini
        const aiResult = await generateEnhancedRecommendations(predictionData);
        const fullText = aiResult.aiRecommendation || aiResult.fallbackRecommendation || '';
        
        // Split the text into words for streaming
        const words = fullText.split(' ');
        const chunkSize = 3; // Send 3 words at a time
        
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, Math.min(i + chunkSize, words.length)).join(' ');
          const isLastChunk = i + chunkSize >= words.length;
          
          const data = {
            content: chunk + (isLastChunk ? '' : ' '),
            done: isLastChunk,
            metadata: isLastChunk ? {
              model: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
              provider: "Google Gemini AI"
            } : undefined
          };
          
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          
          // Add a small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
        res.end();
      }
    };

    streamResponse();

  } catch (error) {
    console.error('Enhanced AI recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced AI recommendations',
      error: error.message
    });
  }
});

// @route   POST /api/predictions/ai-recommendations
// @desc    Get enhanced AI recommendations using Gemini AI (non-streaming)
// @access  Private
router.post('/ai-recommendations', authenticateToken, async (req, res) => {
  try {
    const { prediction } = req.body;

    // Validate that we have prediction data
    if (!prediction) {
      return res.status(400).json({
        success: false,
        message: 'Missing required prediction data'
      });
    }

    // Extract data from the prediction object
    const academicData = prediction.academicData || {};
    
    // Prepare data for Gemini AI
    const predictionData = {
      attendance_percentage: academicData.attendancePercentage || 0,
      exam_proximity_days: academicData.daysUntilExam || null,
      syllabus_completion: academicData.syllabusCompletion || 0,
      average_marks: academicData.averageMarks || null,
      subject: 'Overall',
      class_type: 'General',
      recommendation: prediction.recommendation || 'Not Safe',
      confidence: Math.round(prediction.confidence * 100) || 0,
      explanation: prediction.explanation || 'Based on your academic data'
    };


    // Get enhanced recommendations from OpenAI
    const aiResult = await generateEnhancedRecommendations(predictionData);

    res.json({
      success: true,
      data: {
        ...aiResult,
        inputData: predictionData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Enhanced AI recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced AI recommendations',
      error: error.message
    });
  }
});

// @route   GET /api/predictions/auto
// @desc    Auto-fetch academic data and generate single overall prediction
// @access  Private
router.get('/auto', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentSemester = req.user.semester || 1;

    // Fetch all academic data for the user (remove semester filter to get all data)
    const [attendanceRecords, examRecords, syllabusRecords] = await Promise.all([
      Attendance.find({ userId }).sort({ date: -1 }),
      Exam.find({ userId }).sort({ date: 1 }),
      Syllabus.find({ userId })
    ]);


    // Calculate overall academic metrics (aggregate across all subjects)
    
    // Calculate total attendance percentage
    const totalClasses = attendanceRecords.length;
    const totalPresentClasses = attendanceRecords.filter(record => record.isPresent === true).length;
    const overallAttendancePercentage = totalClasses > 0 ? Math.round((totalPresentClasses / totalClasses) * 100) : 0;

    
    

    // Find next upcoming exam (across all subjects)
    const currentDate = new Date();
    const upcomingExams = examRecords
      .filter(exam => {
        const examDate = new Date(exam.date);
        const isUpcoming = examDate > currentDate;
        return isUpcoming;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    
    const nextExam = upcomingExams[0];
    const daysUntilExam = nextExam 
      ? Math.ceil((new Date(nextExam.date) - currentDate) / (1000 * 60 * 60 * 24))
      : null; // No default - will handle this case separately
    

    // Calculate overall syllabus completion
    const completedSyllabus = syllabusRecords.filter(s => s.isCompleted).length;
    const totalSyllabus = syllabusRecords.length;
    const overallSyllabusCompletion = totalSyllabus > 0 
      ? Math.round((completedSyllabus / totalSyllabus) * 100)
      : 0;


    // Calculate overall average marks from completed exams
    const completedExamsForMarks = examRecords.filter(exam => 
      exam.obtainedMarks !== undefined && 
      exam.obtainedMarks !== null && 
      exam.obtainedMarks > 0
    );
    const overallAverageMarks = completedExamsForMarks.length > 0
      ? Math.round(completedExamsForMarks.reduce((sum, exam) => sum + (exam.obtainedMarks || 0), 0) / completedExamsForMarks.length)
      : null; // No default - will handle this case separately


    // Prepare ML data for single overall prediction
    // Handle cases where no upcoming exams or no marks data exists
    const effectiveDaysUntilExam = daysUntilExam !== null ? daysUntilExam : 365; // Use 1 year as "very distant" if no exams
    const effectiveAverageMarks = overallAverageMarks !== null ? overallAverageMarks : 80; // Use reasonable default for ML only
    const examProximityScore = Math.max(0.1, Math.min(1.0, effectiveDaysUntilExam / 30));
    
    const mlData = {
      attendance_percentage: overallAttendancePercentage,
      exam_proximity: examProximityScore,
      syllabus_completion: overallSyllabusCompletion,
      past_performance: effectiveAverageMarks,
      days_until_exam: effectiveDaysUntilExam,
      subject: 'Overall',
      user_id: userId.toString()
    };

    

    let prediction = null;

    try {
      // Call ML service for single overall prediction
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, mlData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      prediction = {
        recommendation: mlResponse.data.prediction,
        confidence: mlResponse.data.confidence || 0,
        riskLevel: mlResponse.data.risk_level,
        explanation: mlResponse.data.explanation,
        academicData: {
          attendancePercentage: overallAttendancePercentage,
          daysUntilExam,
          syllabusCompletion: overallSyllabusCompletion,
          averageMarks: overallAverageMarks,
          totalClasses,
          totalPresentClasses,
          upcomingExams: upcomingExams.length,
          completedSyllabus,
          totalSyllabus
        },
        nextExam: nextExam ? {
          title: nextExam.title,
          date: nextExam.date,
          daysUntil: daysUntilExam
        } : null
      };

    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      
      // Fallback prediction
      const fallbackRecommendation = getFallbackRecommendation({
        attendancePercentage: overallAttendancePercentage,
        daysUntilExam,
        syllabusCompletion: overallSyllabusCompletion,
        pastPerformanceScore: overallAverageMarks
      });

      prediction = {
        recommendation: fallbackRecommendation.recommendation,
        confidence: fallbackRecommendation.probability || 0,
        riskLevel: fallbackRecommendation.riskLevel,
        explanation: fallbackRecommendation.explanation,
        academicData: {
          attendancePercentage: overallAttendancePercentage,
          daysUntilExam,
          syllabusCompletion: overallSyllabusCompletion,
          averageMarks: overallAverageMarks,
          totalClasses,
          totalPresentClasses,
          upcomingExams: upcomingExams.length,
          completedSyllabus,
          totalSyllabus
        },
        nextExam: nextExam ? {
          title: nextExam.title,
          date: nextExam.date,
          daysUntil: daysUntilExam
        } : null,
        fallback: true
      };
    }

    // Check if we have academic data
    if (!prediction) {
      return res.status(400).json({
        success: false,
        message: 'No academic data found. Please add some attendance, exam, or syllabus records first.',
        data: null
      });
    }

    res.json({
      success: true,
      data: {
        prediction,
        summary: {
          totalClasses,
          totalPresentClasses,
          overallAttendancePercentage,
          upcomingExams: upcomingExams.length,
          nextExamIn: daysUntilExam,
          syllabusProgress: overallSyllabusCompletion,
          averageMarks: overallAverageMarks,
          riskLevel: prediction.riskLevel
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Auto-fetch predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate automatic predictions',
      error: error.message
    });
  }
});

module.exports = router;
