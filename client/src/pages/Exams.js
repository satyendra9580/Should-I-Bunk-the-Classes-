import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

const Exams = () => {
  const { user, token } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    subjectCode: '',
    examType: 'midterm',
    title: '',
    date: '',
    duration: 180,
    totalMarks: 100,
    obtainedMarks: '',
    semester: 1,
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    syllabusTopics: '',
    notes: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/exams', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Exams API response:', data);
        // Handle both possible response formats
        const examsList = data.data?.exams || data.exams || [];
        console.log('Exams list:', examsList);
        setExams(examsList);
      } else {
        setError('Failed to fetch exams');
      }
    } catch (err) {
      setError('Error loading exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const examData = {
        ...formData,
        syllabusTopics: formData.syllabusTopics.split(',').map(topic => topic.trim()).filter(topic => topic)
      };

      // Remove obtainedMarks if it's empty (optional field)
      if (!examData.obtainedMarks || examData.obtainedMarks === '') {
        delete examData.obtainedMarks;
      }

      console.log('Sending exam data:', examData);

      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examData)
      });

      if (response.ok) {
        toast.success('Exam added successfully!');
        setShowAddForm(false);
        setFormData({
          subject: '',
          subjectCode: '',
          examType: 'midterm',
          title: '',
          date: '',
          duration: 180,
          totalMarks: 100,
          obtainedMarks: '',
          semester: 1,
          academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          syllabusTopics: '',
          notes: ''
        });
        fetchExams();
      } else {
        const errorData = await response.json();
        console.error('Exam validation error:', errorData);
        setError(errorData.message || 'Failed to add exam');
        // Show detailed validation errors if available
        if (errorData.errors) {
          const errorMessages = errorData.errors.map(err => `${err.field}: ${err.message}`).join(', ');
          setError(`Validation failed: ${errorMessages}`);
          toast.error(`Validation failed: ${errorMessages}`);
        } else {
          toast.error(errorData.message || 'Failed to add exam');
        }
      }
    } catch (err) {
      setError('Error adding exam');
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchExams();
      } else {
        setError('Failed to delete exam');
      }
    } catch (err) {
      setError('Error deleting exam');
    }
  };

  const getDaysUntilExam = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExamStatus = (examDate) => {
    const daysUntil = getDaysUntilExam(examDate);
    if (daysUntil < 0) return { status: 'completed', color: 'bg-gray-100 text-gray-800' };
    if (daysUntil === 0) return { status: 'today', color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 7) return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'scheduled', color: 'bg-blue-100 text-blue-800' };
  };

  // Calculate exam statistics
  console.log('Calculating stats for exams:', exams);
  const upcomingExams = exams.filter(exam => {
    const daysUntil = getDaysUntilExam(exam.date);
    return daysUntil >= 0; // Today or future exams
  });

  const completedExams = exams.filter(exam => {
    const daysUntil = getDaysUntilExam(exam.date);
    return daysUntil < 0; // Past exams
  });

  console.log('Statistics:', {
    total: exams.length,
    upcoming: upcomingExams.length,
    completed: completedExams.length
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Exam Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your exams</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Add Exam
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Exams</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{exams.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedExams.length}</p>
        </div>
        {/* <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Average Score</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{averageScore}%</p>
        </div> */}
      </div>

      {/* Add Exam Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Add New Exam</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Subject and Subject Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    required
                    placeholder="Enter subject name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    required
                    placeholder="e.g., CS101, MATH201"
                  />
                </div>
              </div>

              {/* Row 2: Exam Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exam Type
                  </label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="viva">Viva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Duration only */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    min="30"
                    max="480"
                    placeholder="120"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Syllabus Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Syllabus Topics (comma-separated)
                </label>
                <textarea
                  value={formData.syllabusTopics}
                  onChange={(e) => setFormData({ ...formData, syllabusTopics: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  rows="3"
                  placeholder="Topic 1, Topic 2, Topic 3..."
                />
              </div>

              {/* Row 5: Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  rows="3"
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming Exams */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Exam Records</h2>
        </div>
        <div className="p-6">
          {upcomingExams.length > 0 ? (
            <div className="grid gap-4">
              {upcomingExams.map((exam) => {
                const examStatus = getExamStatus(exam.date);
                const daysUntil = getDaysUntilExam(exam.date);
                return (
                  <div key={exam._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{exam.subject}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200`}>
                            {exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <p>📅 {formatDate(exam.date)}</p>
                          <p>📊 Total Marks: {exam.totalMarks}</p>
                          {exam.obtainedMarks && (
                            <p>🎯 Obtained: {exam.obtainedMarks}/{exam.totalMarks} ({Math.round((exam.obtainedMarks/exam.totalMarks)*100)}%)</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">📝</p>
              <p>No upcoming exams</p>
              <p className="text-sm">Add your first exam to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Exams */}
      {completedExams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Completed Exams</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {completedExams.map((exam) => (
                <div key={exam._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{exam.subject}</h3>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                          {exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p>📅 {formatDate(exam.date)}</p>
                        <p>📊 Total Marks: {exam.totalMarks}</p>
                        {exam.obtainedMarks && (
                          <p>🎯 Obtained: {exam.obtainedMarks}/{exam.totalMarks} ({Math.round((exam.obtainedMarks/exam.totalMarks)*100)}%)</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(exam._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors ml-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
