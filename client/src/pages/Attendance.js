import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, getAttendanceColor } from '../lib/utils';
import toast from 'react-hot-toast';
import axios from 'axios';

const Attendance = () => {
  const { user, token } = useAuthStore();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data for adding single attendance record
  const [formData, setFormData] = useState({
    subject: '',
    subjectCode: '',
    date: new Date().toISOString().split('T')[0],
    isPresent: true,
    classType: 'lecture',
    duration: 60,
    topic: '',
    notes: '',
    semester: 1,
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  });

  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalClasses: 0,
    presentClasses: 0,
    attendancePercentage: 0,
    subjectWiseStats: []
  });

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.data.attendance || []);
        calculateStats(data.data.attendance || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch attendance data');
        toast.error('Failed to load attendance data');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Error loading attendance data');
      toast.error('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const total = records.length;
    const present = records.filter(record => record.isPresent).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    // Calculate subject-wise stats
    const subjectStats = {};
    records.forEach(record => {
      if (!subjectStats[record.subject]) {
        subjectStats[record.subject] = { total: 0, present: 0 };
      }
      subjectStats[record.subject].total++;
      if (record.isPresent) {
        subjectStats[record.subject].present++;
      }
    });

    const subjectWiseStats = Object.entries(subjectStats).map(([subject, stats]) => ({
      subject,
      total: stats.total,
      present: stats.present,
      percentage: Math.round((stats.present / stats.total) * 100)
    }));

    setStats({
      totalClasses: total,
      presentClasses: present,
      attendancePercentage: percentage,
      subjectWiseStats
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post('/api/attendance', {
        subject: formData.subject,
        date: formData.date,
        status: formData.isPresent,
        notes: formData.notes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Attendance record added successfully!');
      setShowAddForm(false);
      setFormData({
        subject: '',
        subjectCode: '',
        date: new Date().toISOString().split('T')[0],
        isPresent: true,
        classType: 'lecture',
        duration: 60,
        topic: '',
        notes: '',
        semester: 1,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      });
      fetchAttendanceData();
    } catch (err) {
      console.error('Error adding attendance:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to add attendance record');
        toast.error(err.response.data.message || 'Failed to add attendance record');
      } else {
        setError('Error adding attendance record');
        toast.error('Error adding attendance record');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await axios.post('/api/attendance/upload-csv', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully uploaded ${result.data.imported} records!`);
        setShowUploadForm(false);
        setCsvFile(null);
        fetchAttendanceData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload CSV');
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      toast.error('Error uploading CSV file');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/attendance/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Attendance record deleted successfully!');
        fetchAttendanceData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete attendance record');
      }
    } catch (err) {
      console.error('Error deleting attendance:', err);
      toast.error('Error deleting attendance record');
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Attendance Management</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Track and manage your class attendance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>📁</span>
            <span>Upload CSV</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>➕</span>
            <span>Add Attendance</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Classes</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Classes Attended</h3>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.presentClasses}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Attendance Rate</h3>
          <p className={`text-2xl sm:text-3xl font-bold ${getAttendanceColor(stats.attendancePercentage)}`}>
            {stats.attendancePercentage}%
          </p>
        </div>
      </div>

      {/* Add Attendance Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Attendance Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Row 1: Subject and Subject Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    required
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
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Date and Class Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class Type
                  </label>
                  <select
                    name="classType"
                    value={formData.classType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="practical">Practical</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Duration and Attendance Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    placeholder="60"
                  />
                </div>

                <div className="flex items-center justify-center">
                  <label className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      name="isPresent"
                      checked={formData.isPresent}
                      onChange={handleInputChange}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Present</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm sm:text-base"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Upload CSV File</h2>
            <form onSubmit={handleCsvUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">CSV Format:</p>
                <p>subject,subjectCode,date,isPresent,classType,semester,academicYear</p>
                <p className="mt-1 text-xs">Example: Math,MATH101,2024-01-15,true,lecture,1,2024</p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm sm:text-base"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !csvFile}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Attendance Records</h2>
        </div>
        <div className="overflow-x-auto">
          {attendanceRecords.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {attendanceRecords.map((record) => (
                  <tr key={record._id}>
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div>{record.subject}</div>
                      {record.subjectCode && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{record.subjectCode}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.isPresent ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {record.isPresent ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.classType || 'lecture'}
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {record.duration ? `${record.duration} min` : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(record._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors text-xs sm:text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 sm:py-12 px-4 text-gray-500 dark:text-gray-400">
              <div className="text-3xl sm:text-4xl mb-4">📊</div>
              <p className="text-base sm:text-lg mb-2">No attendance records found</p>
              <p className="text-sm mb-4">Start by adding your first attendance record!</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Add First Record
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
