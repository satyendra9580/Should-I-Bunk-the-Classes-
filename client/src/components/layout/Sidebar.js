import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: '📊' },
    { path: '/attendance', name: 'Attendance', icon: '📝' },
    { path: '/exams', name: 'Exams', icon: '📅' },
    { path: '/syllabus', name: 'Syllabus', icon: '📚' },
    { path: '/predictions', name: 'Predictions', icon: '🤖' },
    { path: '/profile', name: 'Profile', icon: '👤' },
    { path: '/settings', name: 'Settings', icon: '⚙️' },
  ];

  const toggleTheme = () => {
    // Theme toggle functionality can be added later
    console.log('Theme toggle clicked');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:z-30`}>
        <div className="p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
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
                🌙
              </span>
              <span>
                Dark Mode
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
