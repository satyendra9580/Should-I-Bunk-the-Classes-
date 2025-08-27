import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

const Predictions = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);


  useEffect(() => {
    if (user && token) {
      fetchAutoPredictions();
    }
  }, [user, token]);

  const fetchAutoPredictions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/predictions/auto', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const summary = data.data.summary || {};
        const prediction = data.data.prediction || null;
        
        // Check if user has meaningful data
        const hasData = (summary.totalClasses > 0) || 
                       (summary.upcomingExams > 0) || 
                       (summary.syllabusProgress > 0);
        
        if (prediction && hasData) {
          setPrediction(prediction);
          setSummary(summary);
        } else {
          // Don't show prediction for users with no meaningful data
          setPrediction(null);
          setSummary(summary);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch predictions');
      }
    } catch (err) {
      console.error('Error fetching auto predictions:', err);
      setError('Error connecting to prediction service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAutoPredictions();
    toast.success('Predictions refreshed!');
  };


  const handleEnhancedRecommendations = async () => {
    setAiLoading(true);
    setError('');
    setAiRecommendations(null);

    try {
      const response = await fetch('/api/predictions/ai-recommendations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prediction: prediction
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI Recommendations Response:', data);
        console.log('AI Recommendations Data:', data.data);
        setAiRecommendations(data.data);
        toast.success('Enhanced AI recommendations generated!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to get AI recommendations');
        toast.error('Failed to get AI recommendations');
      }
    } catch (err) {
      console.error('Error getting AI recommendations:', err);
      setError('Error connecting to AI service. Please try again.');
      toast.error('Error connecting to AI service');
    } finally {
      setAiLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-600 dark:text-red-200 shadow-red-100 dark:shadow-red-900/20';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200 shadow-yellow-100 dark:shadow-yellow-900/20';
      case 'low':
        return 'bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-600 dark:text-green-200 shadow-green-100 dark:shadow-green-900/20';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-900 dark:bg-gray-900/30 dark:border-gray-600 dark:text-gray-200 shadow-gray-100 dark:shadow-gray-900/20';
    }
  };

  const getRecommendationIcon = (recommendation) => {
    if (recommendation?.toLowerCase().includes('attend')) {
      return '✅';
    } else if (recommendation?.toLowerCase().includes('not safe')) {
      return '❌';
    }
    return '⚠️';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🤖 Smart Predictions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI recommendations based on your real academic data
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing your academic data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Academic Predictions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered insights for your academic performance</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Academic Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.totalClasses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.overallAttendancePercentage || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Next Exam</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.nextExamIn || 0} days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall ML Prediction */}
      {prediction ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🤖 ML Prediction Result</h2>
          
          {/* Main Prediction Card */}
          <div className={`p-8 rounded-2xl border-2 shadow-xl ${getRiskLevelColor(prediction.riskLevel)}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{getRecommendationIcon(prediction.recommendation)}</div>
              <h3 className="text-4xl font-bold mb-2">{prediction.recommendation}</h3>
              <p className="text-lg opacity-80">ML Confidence: {Math.round((prediction.confidence || 0) * 100)}%</p>
            </div>
            
            {/* Risk Level Badge */}
            <div className="flex justify-center mb-6">
              <span className={`px-6 py-2 rounded-full text-lg font-bold uppercase tracking-wide ${
                prediction.riskLevel === 'high' ? 'bg-red-500 text-white' :
                prediction.riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {prediction.riskLevel} Risk
              </span>
            </div>
            
            {/* Academic Data Grid */}
            <div className="bg-white/30 dark:bg-black/20 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-semibold mb-4 text-center">Your Academic Data</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalClasses || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Classes</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.overallAttendancePercentage || 0}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.upcomingExams || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Exams</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.syllabusProgress || 0}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Syllabus Done</p>
                </div>
              </div>
            </div>
            
            {/* ML Reasoning */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">ML Reasoning</h4>
              <p className="text-base leading-relaxed">{prediction.explanation}</p>
            </div>
            
            {/* Confidence Bar */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prediction Confidence</h4>
                <span className="font-bold">{Math.round((prediction.confidence || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-4">
                <div 
                  className="bg-current h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (prediction.confidence || 0) * 100))}%` }}
                ></div>
              </div>
            </div>
            
            {/* AI Advice Button */}
            <div className="text-center">
              <button
                onClick={() => handleEnhancedRecommendations(prediction)}
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:shadow-2xl transform hover:scale-105"
              >
                <span>✨</span>
                <span>Get Enhanced AI Advice</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-8 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Academic Data Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                To get intelligent ML predictions and personalized recommendations, you need to add your academic data first.
              </p>
              
              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400 mb-8">
                <div className="flex items-center justify-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                  <span>Add attendance records to track your class participation</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                  <span>Track syllabus progress to monitor your study completion</span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
                  <span>Schedule upcoming exams for better time management</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => navigate('/attendance')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                >
                  <span className="mr-2">📝</span>
                  Add Attendance
                </button>
                <button 
                  onClick={() => navigate('/syllabus')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                >
                  <span className="mr-2">📚</span>
                  Track Syllabus
                </button>
                <button 
                  onClick={() => navigate('/exams')}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center"
                >
                  <span className="mr-2">📅</span>
                  Add Exams
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Once you add data, our ML model will analyze your patterns and provide smart recommendations
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Enhanced AI Recommendations */}
      {aiRecommendations && (
        <div className="mt-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">✨ Enhanced AI Recommendations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Personalized advice powered by Google Gemini 1.5 Flash</p>
              </div>
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                {aiRecommendations.aiRecommendation || aiRecommendations.fallbackRecommendation}
              </div>
            </div>
            
            {aiRecommendations.metadata && (
              <div className="mt-6 pt-4 border-t border-purple-200 dark:border-purple-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Generated at {formatDate(aiRecommendations.metadata.timestamp)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Predictions;
