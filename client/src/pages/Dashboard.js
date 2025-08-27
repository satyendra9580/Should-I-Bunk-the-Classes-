import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { formatPercentage, getAttendanceColor, calculateDaysUntil } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

const StatCard = ({ title, value, subtitle, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);


  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching dashboard data with token:', token ? 'Present' : 'Missing');
      
      const [attendanceRes, examRes, syllabusRes, predictionRes] = await Promise.all([
        axios.get('/attendance', { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.error('Attendance API error:', err.response?.data || err.message);
          return { data: { data: [] } };
        }),
        axios.get('/exams', { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.error('Exams API error:', err.response?.data || err.message);
          return { data: { data: [] } };
        }),
        axios.get('/syllabus', { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.error('Syllabus API error:', err.response?.data || err.message);
          return { data: { data: [] } };
        }),
        axios.get('/predictions/auto', { headers: { Authorization: `Bearer ${token}` } }).catch(err => {
          console.error('Predictions API error:', err.response?.data || err.message);
          return { data: { data: null } };
        })
      ]);

      console.log('=== DASHBOARD DEBUG ===');
      console.log('API Responses:', {
        attendance: attendanceRes.data,
        exams: examRes.data,
        syllabus: syllabusRes.data,
        predictions: predictionRes.data
      });
      console.log('Raw attendance response:', JSON.stringify(attendanceRes.data, null, 2));

      // Use the same data structure as individual pages
      const attendanceData = attendanceRes.data.data?.attendance || [];
      const examData = examRes.data.data?.exams || [];
      const syllabusData = syllabusRes.data.data?.syllabus || [];
      const predictionData = predictionRes.data.data;

      console.log('Extracted Data Arrays:', {
        attendanceCount: attendanceData.length,
        examCount: examData.length,
        syllabusCount: syllabusData.length,
        firstAttendance: attendanceData[0],
        firstExam: examData[0],
        firstSyllabus: syllabusData[0]
      });

      // Process attendance data
      const totalClasses = attendanceData.length;
      const attendedClasses = attendanceData.filter(record => record.isPresent === true).length;
      const overallAttendancePercentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

      console.log('Attendance Processing:', {
        totalClasses,
        attendedClasses,
        overallAttendancePercentage,
        sampleRecord: attendanceData[0],
        presentRecords: attendanceData.filter(r => r.isPresent === true).length,
        absentRecords: attendanceData.filter(r => r.isPresent === false).length
      });

      // Process syllabus data
      const totalTopics = syllabusData.length;
      const completedTopics = syllabusData.filter(topic => topic.isCompleted === true).length;
      const overallSyllabusPercentage = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

      console.log('Syllabus Processing:', {
        totalTopics,
        completedTopics,
        overallSyllabusPercentage,
        sampleTopic: syllabusData[0],
        allDifficulties: syllabusData.map(topic => topic.difficulty),
        incompleteTasks: syllabusData.filter(topic => !topic.isCompleted),
        hardTasks: syllabusData.filter(topic => topic.difficulty === 'hard'),
        pendingHardTasks: syllabusData.filter(topic => !topic.isCompleted && topic.difficulty === 'hard')
      });

      // Process exam data
      const currentDate = new Date();
      const upcomingExams = examData.filter(exam => new Date(exam.date) >= currentDate);
      const upcomingExamsCount = upcomingExams.length;

      console.log('Exam Processing:', {
        totalExams: examData.length,
        upcomingExamsCount,
        currentDate: currentDate.toISOString(),
        sampleExam: examData[0]
      });

      // Group attendance by subject
      const attendanceBySubject = {};
      attendanceData.forEach(record => {
        if (!attendanceBySubject[record.subject]) {
          attendanceBySubject[record.subject] = { total: 0, attended: 0 };
        }
        attendanceBySubject[record.subject].total++;
        if (record.isPresent === true) {
          attendanceBySubject[record.subject].attended++;
        }
      });

      const subjectAttendance = Object.entries(attendanceBySubject).map(([subject, data]) => ({
        subject,
        totalClasses: data.total,
        attendedClasses: data.attended,
        attendancePercentage: data.total > 0 ? (data.attended / data.total) * 100 : 0,
        canBunk: data.total > 0 ? (data.attended / data.total) * 100 >= 75 : false
      }));

      console.log('Subject Attendance Processing:', {
        attendanceBySubject,
        subjectAttendance
      });

      setDashboardData({
        overview: {
          overallAttendancePercentage,
          overallSyllabusPercentage,
          upcomingExamsCount,
          pendingHighPriorityTopics: syllabusData.filter(topic => !topic.isCompleted).length
        },
        attendance: {
          overall: { totalClasses, attendedClasses },
          subjects: subjectAttendance
        },
        exams: {
          upcoming: upcomingExams.slice(0, 5)
        },
        syllabus: {
          overall: { totalTopics, completedTopics }
        }
      });

      // Set prediction data only if there's meaningful data
      const hasAttendanceData = attendanceData.length > 0;
      const hasExamData = examData.length > 0;
      const hasSyllabusData = syllabusData.length > 0;
      
      // Only show predictions if user has some data to base predictions on
      if (predictionData?.prediction && (hasAttendanceData || hasExamData || hasSyllabusData)) {
        setPredictions([predictionData.prediction]);
      } else {
        setPredictions([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't set error, just show empty state with default data
      setDashboardData({
        overview: {
          overallAttendancePercentage: 0,
          overallSyllabusPercentage: 0,
          upcomingExamsCount: 0,
          pendingHighPriorityTopics: 0
        },
        attendance: {
          overall: { totalClasses: 0, attendedClasses: 0 },
          subjects: []
        },
        exams: {
          upcoming: []
        },
        syllabus: {
          overall: { totalTopics: 0, completedTopics: 0 }
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, attendance, exams, syllabus } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's your academic overview for today
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Overall Attendance"
          value={formatPercentage(overview?.overallAttendancePercentage || 0)}
          subtitle={`${attendance?.overall?.attendedClasses || 0} / ${attendance?.overall?.totalClasses || 0} classes`}
          color={getAttendanceColor(overview?.overallAttendancePercentage || 0)}
        />
        <StatCard
          title="Syllabus Progress"
          value={formatPercentage(overview?.overallSyllabusPercentage || 0)}
          subtitle={`${syllabus?.overall?.completedTopics || 0} / ${syllabus?.overall?.totalTopics || 0} topics`}
          color="text-blue-600"
        />
        <StatCard
          title="Upcoming Exams"
          value={overview?.upcomingExamsCount || 0}
          subtitle="Next 30 days"
          color="text-orange-600"
        />
        <StatCard
          title="Pending Tasks"
          value={overview?.pendingHighPriorityTopics || 0}
          subtitle="Incomplete topics"
          color="text-purple-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">📊 Academic Insights</h2>
          <div className="space-y-4">
            {attendance?.subjects && attendance.subjects.length > 0 ? (
              attendance.subjects.slice(0, 4).map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{subject.subject}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {subject.attendedClasses}/{subject.totalClasses} classes
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getAttendanceColor(subject.attendancePercentage)}`}>
                    {formatPercentage(subject.attendancePercentage)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {subject.attendancePercentage >= 75 ? '✅ Safe' : '⚠️ At Risk'}
                  </p>
                </div>
              </div>
              ))
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📚 Study Recommendations</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>Focus on your weak subjects</li>
                <li>Attend classes regularly</li>
                <li>Practice consistently</li>
              </ul>
              <button 
                onClick={() => navigate('/attendance')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Attendance
              </button>
              </div>
            )}
          </div>
        </div>

        {/* Smart Recommendations */}
        {predictions.length > 0 && predictions[0] && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
              <span className="text-2xl mr-2">🎯</span>
              Smart Bunk Recommendation
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Overall Performance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Based on your complete academic profile</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    predictions[0].recommendation === 'Safe to Bunk' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}>
                    {predictions[0].recommendation === 'Safe to Bunk' ? '✅ Safe to Bunk' : '❌ Not Safe'}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.round(predictions[0].confidence * 100)}% confidence
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {predictions[0].explanation}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => navigate('/predictions')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Get Detailed Analysis →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">🎯 ML Predictions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate('/attendance')}
              className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Attendance</p>
            </button>
            <button 
              onClick={() => navigate('/syllabus')}
              className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-green-300 dark:hover:border-green-500 transition-colors group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📚</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Update Syllabus</p>
            </button>
            <button 
              onClick={() => navigate('/exams')}
              className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-500 transition-colors group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Exam</p>
            </button>
            <button 
              onClick={() => navigate('/predictions')}
              className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-500 transition-colors group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Get Prediction</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
