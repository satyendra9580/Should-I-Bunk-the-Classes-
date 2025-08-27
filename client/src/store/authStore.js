import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      // Initialize auth state from localStorage
      initializeAuth: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // Set token in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Verify token and get user data
            const response = await axios.get('/auth/me');
            
            set({
              user: response.data.data.user,
              token,
              isInitialized: true,
            });
          } catch (error) {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            set({
              user: null,
              token: null,
              isInitialized: true,
            });
          }
        } else {
          set({ isInitialized: true });
        }
      },

      // Login function
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/auth/login', {
            email,
            password,
          });

          const { user, token } = response.data.data;

          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isLoading: false,
          });

          toast.success('Login successful!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Login failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Register function
      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await axios.post('/auth/register', userData);

          const { user, token } = response.data.data;

          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isLoading: false,
          });

          toast.success('Registration successful!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Registration failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Logout function
      logout: async () => {
        try {
          // Call logout endpoint
          await axios.post('/auth/logout');
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);
        }

        // Clear local storage
        localStorage.removeItem('token');
        
        // Remove token from axios headers
        delete axios.defaults.headers.common['Authorization'];

        set({
          user: null,
          token: null,
        });

        toast.success('Logged out successfully');
      },

      // Update user profile
      updateProfile: async (profileData) => {
        try {
          const response = await axios.put('/users/profile', profileData);
          
          set({
            user: response.data.data.user,
          });

          toast.success('Profile updated successfully!');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Profile update failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        try {
          await axios.post('/auth/change-password', {
            currentPassword,
            newPassword,
          });

          toast.success('Password changed successfully!');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Password change failed';
          toast.error(message);
          return { success: false, message };
        }
      },

      // Refresh token
      refreshToken: async () => {
        try {
          const response = await axios.post('/auth/refresh');
          const { token } = response.data.data;

          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({ token });
          return { success: true };
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          return { success: false };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);

// Axios interceptor for handling token expiration
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken } = useAuthStore.getState();
      const result = await refreshToken();

      if (result.success) {
        // Retry the original request with new token
        return axios(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export { useAuthStore };
