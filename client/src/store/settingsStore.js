import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: {
        notifications: {
          emailNotifications: true,
          examReminders: true,
          attendanceAlerts: true,
          weeklyReports: false
        },
        preferences: {
          theme: 'dark',
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
      },
      
      // Actions
      updateSetting: (category, key, value) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...state.settings[category],
              [key]: value
            }
          }
        }));
        
        // Apply theme changes immediately
        if (category === 'preferences' && key === 'theme') {
          get().applyTheme(value);
        }
      },
      
      updateAllSettings: (newSettings) => {
        const currentTheme = get().settings.preferences.theme;
        set({ settings: newSettings });
        // Only apply theme if it actually changed
        if (newSettings.preferences.theme !== currentTheme) {
          get().applyTheme(newSettings.preferences.theme);
        }
      },

      // Method to update settings without triggering theme changes
      updateSettingsWithoutThemeChange: (newSettings) => {
        set({ settings: newSettings });
      },
      
      resetToDefaults: () => {
        const defaultSettings = {
          notifications: {
            emailNotifications: true,
            examReminders: true,
            attendanceAlerts: true,
            weeklyReports: false
          },
          preferences: {
            theme: 'light',
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
        };
        set({ settings: defaultSettings });
        get().applyTheme(defaultSettings.preferences.theme);
      },
      
      // Theme application
      applyTheme: (theme) => {
        const root = document.documentElement;
        
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else if (theme === 'auto') {
          // Check system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },
      
      // Language helpers
      getLanguageText: (key, fallback = key) => {
        const state = get();
        const language = state.settings?.preferences?.language || 'en';
        const translations = state.translations;
        
        if (translations[language] && translations[language][key]) {
          return translations[language][key];
        }
        return fallback;
      },
      
      // Basic translations (can be expanded)
      translations: {
        en: {
          dashboard: 'Dashboard',
          attendance: 'Attendance',
          exams: 'Exams',
          syllabus: 'Syllabus',
          profile: 'Profile',
          settings: 'Settings',
          logout: 'Logout',
          welcome: 'Welcome',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          add: 'Add',
          loading: 'Loading...',
          error: 'Error',
          success: 'Success'
        },
        es: {
          dashboard: 'Panel de Control',
          attendance: 'Asistencia',
          exams: 'Exámenes',
          syllabus: 'Programa',
          profile: 'Perfil',
          settings: 'Configuración',
          logout: 'Cerrar Sesión',
          welcome: 'Bienvenido',
          save: 'Guardar',
          cancel: 'Cancelar',
          delete: 'Eliminar',
          edit: 'Editar',
          add: 'Agregar',
          loading: 'Cargando...',
          error: 'Error',
          success: 'Éxito'
        },
        fr: {
          dashboard: 'Tableau de Bord',
          attendance: 'Présence',
          exams: 'Examens',
          syllabus: 'Programme',
          profile: 'Profil',
          settings: 'Paramètres',
          logout: 'Déconnexion',
          welcome: 'Bienvenue',
          save: 'Enregistrer',
          cancel: 'Annuler',
          delete: 'Supprimer',
          edit: 'Modifier',
          add: 'Ajouter',
          loading: 'Chargement...',
          error: 'Erreur',
          success: 'Succès'
        },
        de: {
          dashboard: 'Dashboard',
          attendance: 'Anwesenheit',
          exams: 'Prüfungen',
          syllabus: 'Lehrplan',
          profile: 'Profil',
          settings: 'Einstellungen',
          logout: 'Abmelden',
          welcome: 'Willkommen',
          save: 'Speichern',
          cancel: 'Abbrechen',
          delete: 'Löschen',
          edit: 'Bearbeiten',
          add: 'Hinzufügen',
          loading: 'Laden...',
          error: 'Fehler',
          success: 'Erfolg'
        }
      },
      
      // Date formatting based on user preference
      formatDate: (date, format = null) => {
        const state = get();
        const dateFormat = state.settings?.preferences?.dateFormat || 'MM/DD/YYYY';
        const targetFormat = format || dateFormat;
        
        if (!date) return '';
        
        const dateObj = new Date(date);
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        
        switch (targetFormat) {
          case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
          case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
          case 'MM/DD/YYYY':
          default:
            return `${month}/${day}/${year}`;
        }
      }
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);

export default useSettingsStore;
