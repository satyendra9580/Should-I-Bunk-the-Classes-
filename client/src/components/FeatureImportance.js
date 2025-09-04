import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const FeatureImportance = () => {
  const { token } = useAuthStore();
  const [featureData, setFeatureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeatureImportance();
  }, []);

  const fetchFeatureImportance = async () => {
    try {
      
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5004/api'}/ml/feature-importance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          setFeatureData(data.data);
          setError('');
        } else {
          console.error('❌ Unexpected data structure:', data);
          setError('Received invalid data format from server');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Feature importance API error:', response.status, response.statusText, errorText);
        setError(`Failed to load feature importance data (${response.status}: ${response.statusText})`);
      }
    } catch (err) {
      console.error('💥 Feature importance fetch error:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high_positive':
        return 'text-green-600';
      case 'moderate_positive':
        return 'text-green-500';
      case 'low_positive':
        return 'text-yellow-500';
      case 'neutral':
        return 'text-gray-500';
      case 'low_negative':
        return 'text-orange-500';
      case 'moderate_negative':
        return 'text-red-500';
      case 'high_negative':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getImpactIcon = (impact) => {
    if (impact.includes('positive')) return '↑';
    if (impact.includes('negative')) return '↓';
    return '→';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🧠</span>
          ML Feature Importance Analysis
        </h3>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!featureData) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🧠</span>
        Your Bunk Safety Analysis
      </h3>
      
      <div className="space-y-6">
        {/* Summary Section */}
        {featureData.summary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800">Overall Safety Score</h4>
              <span className="text-2xl font-bold text-blue-600">
                {featureData.summary.overall_safety}%
              </span>
            </div>
            <p className="text-gray-700 mb-2">
              <strong>Top Strength:</strong> {featureData.summary.top_strength}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Main Concern:</strong> {featureData.summary.main_concern}
            </p>
            <p className="text-blue-700 font-medium">
              💡 {featureData.summary.quick_advice}
            </p>
          </div>
        )}
        
        {/* Individual Insights */}
        {featureData.insights && featureData.insights.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">Detailed Analysis</h4>
            {featureData.insights.map((insight, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{insight.icon}</span>
                    <h5 className="font-semibold text-gray-800">{insight.name}</h5>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${getImpactColor(insight.impact)}`}>
                      {insight.safetyPercentage}%
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(insight.safetyPercentage)}`}
                    style={{ width: `${insight.safetyPercentage}%` }}
                  ></div>
                </div>
                
                <p className="text-gray-600 mb-2 text-sm">
                  {insight.description}
                </p>
                <p className="text-gray-800 font-medium text-sm">
                  💡 {insight.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {/* Actionable Tips */}
        {featureData.actionable_tips && featureData.actionable_tips.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Action Items
            </h4>
            <ul className="space-y-2">
              {featureData.actionable_tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* No Data Fallback */}
        {(!featureData.insights || featureData.insights.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">📊 No analysis available yet</p>
            <p className="text-sm">Add more attendance records, exams, and syllabus data to see detailed insights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureImportance;
