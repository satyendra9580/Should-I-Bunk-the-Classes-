import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { formatDate } from '../lib/utils';

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
    date: '',
    duration: 180,
    totalMarks: 100,
    syllabusTopics: '',
    notes: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/exams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setExams(response.data.exams || []);
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

      // Remove empty optional fields
      if (!examData.obtainedMarks || examData.obtainedMarks === '') {
        delete examData.obtainedMarks;
      }
      if (!examData.syllabusTopics || examData.syllabusTopics.length === 0) {
        delete examData.syllabusTopics;
      }
      if (!examData.notes || examData.notes.trim() === '') {
        delete examData.notes;
      }


      const response = await axios.post('/api/exams', examData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Exam added successfully!');
        setShowAddForm(false);
        setFormData({
          subject: '',
          subjectCode: '',
          examType: 'midterm',
          date: '',
          duration: 180,
          totalMarks: 100,
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
      const response = await axios.delete(`/api/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Exam deleted successfully!');
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
  const upcomingExams = exams.filter(exam => {
    const daysUntil = getDaysUntilExam(exam.date);
    return daysUntil >= 0; // Today or future exams
  });

  const completedExams = exams.filter(exam => {
    const daysUntil = getDaysUntilExam(exam.date);
    return daysUntil < 0; // Past exams
  });


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Exam Management</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track and manage your exams</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
          >
            + Add Exam
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Exams</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{exams.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</h3>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{completedExams.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Upcoming</h3>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{upcomingExams.length}</p>
        </div>
      </div>

      {/* Add Exam Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-900 dark:text-gray-100">Add New Exam</h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Row 1: Subject and Subject Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors text-sm sm:text-base"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors text-sm sm:text-base"
                    required
                    placeholder="e.g., CS101, MATH201"
                  />
                </div>
              </div>

              {/* Row 2: Exam Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exam Type
                  </label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors text-sm sm:text-base"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="viva">Viva</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Date and Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                    min="30"
                    max="480"
                    placeholder="120"
                    required
                  />
                </div>
              </div>

              {/* Row 4: Total Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                    min="1"
                    max="1000"
                    placeholder="100"
                    required
                  />
                </div>
              </div>

              {/* Row 5: Syllabus Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Syllabus Topics (comma-separated)
                </label>
                <textarea
                  value={formData.syllabusTopics}
                  onChange={(e) => setFormData({ ...formData, syllabusTopics: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                  rows="3"
                  placeholder="Topic 1, Topic 2, Topic 3..."
                />
              </div>

              {/* Row 6: Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
                  rows="3"
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium"
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
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Exam Records</h2>
        </div>
        <div className="p-4 sm:p-6">
          {upcomingExams.length > 0 ? (
            <div className="grid gap-3 sm:gap-4">
              {upcomingExams.map((exam) => {
                const examStatus = getExamStatus(exam.date);
                const daysUntil = getDaysUntilExam(exam.date);
                return (
                  <div key={exam._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{exam.subject}</h3>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 w-fit`}>
                              {exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full w-fit ${examStatus.color}`}>
                              {daysUntil === 0 ? 'Today' : 
                               daysUntil === 1 ? '1 day left' : 
                               daysUntil > 1 ? `${daysUntil} days left` : 
                               'Completed'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <p>📚 Subject: {exam.subject} ({exam.subjectCode})</p>
                          <p>📅 {formatDate(exam.date)}</p>
                          <p>⏱️ Duration: {exam.duration} minutes</p>
                          <p>📊 Total Marks: {exam.totalMarks}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors text-xs sm:text-sm self-start sm:ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 px-4 text-gray-500 dark:text-gray-400">
              <p className="text-3xl sm:text-4xl mb-2">📝</p>
              <p className="text-base sm:text-lg mb-2">No upcoming exams</p>
              <p className="text-sm">Add your first exam to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Exams */}
      {completedExams.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Completed Exams</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid gap-3 sm:gap-4">
              {completedExams.map((exam) => (
                <div key={exam._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-700">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{exam.subject}</h3>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 w-fit">
                            {exam.examType.charAt(0).toUpperCase() + exam.examType.slice(1)}
                          </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full w-fit bg-gray-100 text-gray-800">
                            Completed
                          </span>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p>📚 Subject: {exam.subject} ({exam.subjectCode})</p>
                        <p>📅 {formatDate(exam.date)}</p>
                        <p>⏱️ Duration: {exam.duration} minutes</p>
                        <p>📊 Total Marks: {exam.totalMarks}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(exam._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors text-xs sm:text-sm self-start sm:ml-4"
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
