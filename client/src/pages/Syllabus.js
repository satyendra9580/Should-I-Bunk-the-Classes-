import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';
import axios from 'axios';

const Syllabus = () => {
  const { user, token } = useAuthStore();
  const [syllabusItems, setSyllabusItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    subjectCode: '',
    topic: '',
    description: '',
    difficulty: 'medium',
    priority: 'medium',
    estimatedHours: 2,
    semester: 1,
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    weightage: 5,
    dueDate: '',
    status: 'not_started'
  });
  const [stats, setStats] = useState({
    totalTopics: 0,
    completedTopics: 0,
    inProgressTopics: 0,
    completionPercentage: 0
  });

  useEffect(() => {
    fetchSyllabusData();
  }, []);

  const fetchSyllabusData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/syllabus', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Axios automatically parses JSON and throws on error status
      const data = response.data;
      
      // Handle backend response format: data.data.syllabus
      const syllabusList = data.data?.syllabus || data.syllabus || [];
      setSyllabusItems(syllabusList);
      
      // Calculate stats
      const total = syllabusList?.length || 0;
      const completed = syllabusList?.filter(item => {
        return item.isCompleted === true;
      }).length || 0;

      const inProgress = total - completed; 
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      setSyllabusStats({
        total,
        completed,
        inProgress,
        completionPercentage
      });
    } catch (err) {
      console.error('Error loading syllabus data:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Error loading syllabus data');
      } else {
        setError('Error loading syllabus data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/syllabus', {
        subject: formData.subject,
        topic: formData.topic,
        priority: formData.priority
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setShowAddForm(false);
      setFormData({
        subject: '',
        subjectCode: '',
        topic: '',
        description: '',
        difficulty: 'medium',
        priority: 'medium',
        estimatedHours: 2,
        semester: 1,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        weightage: 5,
        dueDate: '',
        status: 'not_started'
      });
      fetchSyllabusData();
    } catch (err) {
      setError('Error adding syllabus item');
      toast.error('Failed to add syllabus item');
    }
  };

  const handleStatusUpdate = async (itemId, newStatus) => {
    try {
      
      // Convert status to isCompleted boolean for backend
      const isCompleted = newStatus === 'completed';
      
      const response = await axios.put(`/api/syllabus/${itemId}`, {
        isCompleted
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      
      toast.success('Status updated successfully!');
      // Force refresh the data
      await fetchSyllabusData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Error updating status');
      toast.error('Error updating status');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this syllabus item?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/syllabus/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchSyllabusData();
      } else {
        setError('Failed to delete syllabus item');
      }
    } catch (err) {
      setError('Error deleting syllabus item');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const groupedBySubject = syllabusItems.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = [];
    }
    acc[item.subject].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Syllabus Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your course syllabus progress</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Add Topic
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Topics</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTopics}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completedTopics}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgressTopics}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completion Rate</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.completionPercentage}%</p>
        </div>
      </div>

      {/* Syllabus Topics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Syllabus Topics</h2>
        </div>
        <div className="p-6">
          {syllabusItems.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedBySubject).map(([subject, items]) => (
                <div key={subject} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                    {subject}
                  </h3>
                  <div className="grid gap-3">
                    {items.map((item) => (
                      <div key={item._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">{item.topic}</h4>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'}`}>
                                {item.isCompleted ? 'Completed' : 'Pending'}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleStatusUpdate(item._id, item.isCompleted ? 'not_started' : 'completed')}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                item.isCompleted 
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500' 
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {item.isCompleted ? 'Mark Pending' : 'Mark Complete'}
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-lg mb-2">No syllabus topics found</p>
              <p className="text-sm mb-4">Start by adding your first topic!</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add First Topic
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Topic Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Add Syllabus Topic</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Subject and Subject Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
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
                    name="subjectCode"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({...formData, subjectCode: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    required
                    placeholder="e.g., CS101, MATH201"
                  />
                </div>
              </div>

              {/* Row 2: Topic and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic *
                  </label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    required
                    placeholder="Enter topic name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  />
                </div>
              </div>

              {/* Row 3: Difficulty, Priority, and Estimated Hours */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value)})}
                    min="1"
                    placeholder="5"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  />
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Add topic description..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Syllabus;
