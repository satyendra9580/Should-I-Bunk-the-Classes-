import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // default theme
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else if (theme === 'auto') {
          // Auto theme based on system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      
      setLanguage: (language) => {
        set({ language });
        // Here you could add i18n logic
      },
      
      setTimezone: (timezone) => {
        set({ timezone });
      },
      
      setDateFormat: (dateFormat) => {
        set({ dateFormat });
      },
      
      updateSettings: (settings) => {
        const { preferences } = settings;
        if (preferences) {
          if (preferences.theme) get().setTheme(preferences.theme);
          if (preferences.language) get().setLanguage(preferences.language);
          if (preferences.timezone) get().setTimezone(preferences.timezone);
          if (preferences.dateFormat) get().setDateFormat(preferences.dateFormat);
        }
      },
      
      initializeTheme: () => {
        const { theme } = get();
        get().setTheme(theme);
      }
    }),
    {
      name: 'theme-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        timezone: state.timezone,
        dateFormat: state.dateFormat
      })
    }
  )
);

export default useThemeStore;
