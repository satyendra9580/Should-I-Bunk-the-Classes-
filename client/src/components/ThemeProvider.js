import React, { useEffect } from 'react';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Apply dark theme by default
    document.documentElement.classList.add('dark');
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
