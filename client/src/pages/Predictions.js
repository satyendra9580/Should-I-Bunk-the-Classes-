import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://should-i-bunk-the-classes.onrender.com'}/api/predictions/auto`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const predictionData = response.data.data?.prediction;
      const summaryData = response.data.data?.summary || {};
      
      setPrediction(predictionData);
      setSummary(summaryData);
      
      const hasData = (summaryData.totalClasses > 0) || 
                       (summaryData.upcomingExams > 0) || 
                       (summaryData.syllabusProgress > 0);
        
      if (predictionData && hasData) {
        setPrediction(predictionData);
      } else {
        setPrediction(null);
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Error fetching auto predictions:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Error connecting to prediction service. Please try again.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Error connecting to prediction service. Please try again.');
      }
      // Set empty data to prevent undefined errors
      setPrediction(null);
      setSummary({
        totalClasses: 0,
        upcomingExams: 0,
        syllabusProgress: 0
      });
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
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://should-i-bunk-the-classes.onrender.com'}/api/predictions/ai-recommendations`, {
        attendanceData: summary?.attendanceData,
        examData: summary?.examData,
        syllabusData: summary?.syllabusData,
        prediction: prediction
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResult = response.data.data;
      setAiRecommendations(aiResult);
      toast.success('AI recommendations generated successfully!');
      
    } catch (err) {
      console.error('Error getting AI recommendations:', err);
      const errorMessage = err.response?.data?.message || 'Error connecting to AI service. Please try again.';
      setError(errorMessage);
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

      {/* ML Analysis Section */}
      {prediction ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-xl">🤖</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              ML Prediction Result
            </h2>
          </div>
          
          {/* Enhanced ML Prediction Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 p-8 shadow-2xl border border-blue-200 dark:border-gray-700">
            {/* Animated background effects */}
            <div className="absolute inset-0 opacity-20 dark:opacity-30">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative z-10">
              {/* Main Prediction Display */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-28 h-28 mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-75"></div>
                  <div className="relative bg-white dark:bg-gray-900 rounded-full w-24 h-24 flex items-center justify-center border-4 border-yellow-400 shadow-lg">
                    <span className="text-6xl">{getRecommendationIcon(prediction.recommendation)}</span>
                  </div>
                </div>
                
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {prediction.recommendation}
                </h3>
                
                <div className="inline-flex items-center gap-3 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm rounded-full px-6 py-3 border border-gray-300 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">ML Confidence</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round((prediction.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className="flex justify-center mb-8">
                <div className="relative group">
                  <div className={`absolute inset-0 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity ${
                    prediction.riskLevel === 'high' ? 'bg-red-500' :
                    prediction.riskLevel === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <div className={`relative px-8 py-4 rounded-2xl font-bold text-lg uppercase tracking-wider border-2 ${
                    prediction.riskLevel === 'high' ? 
                      'bg-gradient-to-r from-red-600 to-red-500 border-red-400 text-white' :
                    prediction.riskLevel === 'medium' ? 
                      'bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-400 text-gray-900' :
                      'bg-gradient-to-r from-green-600 to-green-500 border-green-400 text-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {prediction.riskLevel === 'high' ? '🔴' : prediction.riskLevel === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <span>{prediction.riskLevel} Risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Metrics Grid */}
              <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-xl font-bold mb-6 text-center text-gray-900 dark:text-white flex items-center justify-center gap-3">
                  <span className="text-2xl">📊</span>
                  Your Academic Metrics
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-600/20 dark:to-blue-700/20 backdrop-blur-sm rounded-xl p-5 border border-blue-300 dark:border-blue-500/30 hover:border-blue-400 dark:hover:border-blue-400/50 shadow-sm">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
                      <div className="relative">
                        <div className="text-3xl mb-2">📚</div>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{summary.totalClasses || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Classes</p>
                      </div>
                    </div>
                  </div>
                  <div className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 dark:from-green-600/20 dark:to-green-700/20 backdrop-blur-sm rounded-xl p-5 border border-green-300 dark:border-green-500/30 hover:border-green-400 dark:hover:border-green-400/50 shadow-sm">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-green-400 rounded-full filter blur-3xl opacity-20"></div>
                      <div className="relative">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{summary.overallAttendancePercentage || 0}%</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Attendance</p>
                      </div>
                    </div>
                  </div>
                  <div className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="relative overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-600/20 dark:to-purple-700/20 backdrop-blur-sm rounded-xl p-5 border border-purple-300 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-400/50 shadow-sm">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400 rounded-full filter blur-3xl opacity-20"></div>
                      <div className="relative">
                        <div className="text-3xl mb-2">📝</div>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{summary.upcomingExams || 0}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Upcoming</p>
                      </div>
                    </div>
                  </div>
                  <div className="group hover:scale-105 transition-all duration-300 cursor-pointer">
                    <div className="relative overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-600/20 dark:to-orange-700/20 backdrop-blur-sm rounded-xl p-5 border border-orange-300 dark:border-orange-500/30 hover:border-orange-400 dark:hover:border-orange-400/50 shadow-sm">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-orange-400 rounded-full filter blur-3xl opacity-20"></div>
                      <div className="relative">
                        <div className="text-3xl mb-2">🎯</div>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{summary.syllabusProgress || 0}%</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Syllabus</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Explanation */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h4 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    Detailed Explanation
                  </h4>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {prediction.explanation}
                </p>
              </div>
              
              {/* AI Recommendation Button */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => handleEnhancedRecommendations()}
                  disabled={aiLoading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
                >
                  {aiLoading ? (
                    <>
                      <span className="animate-spin text-2xl">⚡</span>
                      <span>Generating AI Insights...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">✨</span>
                      <span>Get Personalized AI Recommendations</span>
                    </>
                  )}
                </button>
              </div>
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
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-xl">✨</span>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                AI Recommendations
              </h2>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-3xl border-2 border-indigo-200 dark:border-indigo-700 p-8 shadow-xl">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 border border-white/50 dark:border-gray-700/50">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                    {aiRecommendations?.aiRecommendation || aiRecommendations?.fallbackRecommendation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Predictions;
