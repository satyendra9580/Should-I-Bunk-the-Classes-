import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Settings = () => {
  const { user, token, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [localSettings, setLocalSettings] = useState({
    notifications: {
      emailNotifications: true,
      examReminders: true,
      attendanceAlerts: true,
      weeklyReports: false
    },
    preferences: {
      theme: settings?.preferences?.theme || 'dark',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    privacy: {
      profileVisibility: 'private',
      shareAttendance: false,
      shareExamResults: false
    },
    academic: {
      defaultAttendanceGoal: 75,
      reminderDaysBefore: 3,
      autoCalculateGPA: true
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);


  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setLocalSettings(response.data.settings || {});
    } catch (err) {
      console.error('Error loading settings:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to load settings');
      } else {
        setError('Error loading settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await axios.put('/api/auth/settings', localSettings, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Settings updated successfully!');
        setSuccess('Settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error saving settings');
      }
    } catch (err) {
      setError('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.delete('/api/auth/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Account deleted successfully');
        logout();
        navigate('/login');
      } else {
        setError('Error deleting account');
      }
    } catch (err) {
      setError('Error deleting account');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  if (loading && Object.keys(localSettings).length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setLocalSettings({
              notifications: {
                emailNotifications: true,
                examReminders: true,
                attendanceAlerts: true,
                pushNotifications: false,
                weeklyReports: true
              },
              privacy: {
                profileVisibility: 'private',
                shareAttendance: false,
                shareExamResults: false
              },
              academic: {
                defaultAttendanceGoal: 75,
                reminderDaysBefore: 3,
                autoCalculateGPA: true
              }
            })}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}


      {/* App Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">App Preferences</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize your app experience</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={settings?.preferences?.theme || 'light'}
                onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={settings?.preferences?.language || 'en'}
                onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={settings?.preferences?.timezone || 'UTC'}
                onChange={(e) => updateSetting('preferences', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Kolkata">India</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <select
                value={settings?.preferences?.dateFormat || 'MM/DD/YYYY'}
                onChange={(e) => updateSetting('preferences', 'dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Academic Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure academic preferences</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Attendance Goal (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings?.academic?.defaultAttendanceGoal || 75}
                onChange={(e) => updateSetting('academic', 'defaultAttendanceGoal', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exam Reminder (Days Before)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings?.academic?.reminderDaysBefore || 3}
                onChange={(e) => updateSetting('academic', 'reminderDaysBefore', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>


      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800">
        <div className="p-6 border-b border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Irreversible actions</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Delete Account</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This action cannot be undone. This will permanently delete your account and all associated data including attendance records, exams, and syllabus progress.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your password to confirm:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Your password"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={loading || !deletePassword}
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
