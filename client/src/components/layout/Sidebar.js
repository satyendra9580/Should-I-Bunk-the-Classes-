import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';

const Sidebar = () => {
  const { user } = useAuthStore();
  const { settings, updateSetting, getLanguageText } = useSettingsStore();
  const location = useLocation();

  if (!user) return null;

  const menuItems = [
    { path: '/dashboard', name: getLanguageText('dashboard', 'Dashboard'), icon: '📊' },
    { path: '/attendance', name: getLanguageText('attendance', 'Attendance'), icon: '📝' },
    { path: '/exams', name: getLanguageText('exams', 'Exams'), icon: '📅' },
    { path: '/syllabus', name: getLanguageText('syllabus', 'Syllabus'), icon: '📚' },
    { path: '/predictions', name: 'Predictions', icon: '🤖' },
    { path: '/profile', name: getLanguageText('profile', 'Profile'), icon: '👤' },
    { path: '/settings', name: getLanguageText('settings', 'Settings'), icon: '⚙️' },
  ];

  const toggleTheme = () => {
    const currentTheme = settings?.preferences?.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    updateSetting('preferences', 'theme', newTheme);
  };

  return (
    <div className="fixed left-0 top-16 h-full w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 z-40 transition-colors duration-200">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Theme Toggle Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="text-lg">
              {(settings?.preferences?.theme || 'light') === 'dark' ? '☀️' : '🌙'}
            </span>
            <span>
              {(settings?.preferences?.theme || 'light') === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
