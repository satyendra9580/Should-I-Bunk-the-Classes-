import React, { useEffect } from 'react';
import useSettingsStore from '../store/settingsStore';

const ThemeProvider = ({ children }) => {
  const { settings, applyTheme } = useSettingsStore();

  useEffect(() => {
    const theme = settings?.preferences?.theme || 'dark';
    applyTheme(theme);

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings?.preferences?.theme, applyTheme]);

  return <>{children}</>;
};

export default ThemeProvider;
