import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  email_verified?: boolean;
  account_status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  is_onboarded?: boolean;
  onboarding_step?: number;
  created_at?: string;
  last_login_at?: string;
  profile?: {
    full_name: string;
    age?: number;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    height_cm?: number;
    weight_kg?: number;
    activity_level?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
    goal_type?: 'LOSE' | 'MAINTAIN' | 'GAIN' | 'TRANSFORM';
    bmr_calories?: number;
    daily_calorie_target?: number;
    daily_protein_target?: number;
    daily_carbs_target?: number;
    daily_fat_target?: number;
    target_formula?: 'AUTO' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'CUSTOM';
    step_goal?: number;
  };
  user_pref?: {
    katori_size_ml?: number;
    roti_thickness?: string;
    dietary_preference?: 'VEG' | 'NON_VEG';
    google_fit_synced?: boolean;
    notification_enabled?: boolean;
    mic_permission?: boolean;
  };
}

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  getUserProfile: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isInitializing: false,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = response.data.data;

      await Keychain.setGenericPassword('access_token', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      const profileResponse = await api.get('/user/profile');

      set({
        user: profileResponse.data.data,
        isAuthenticated: true,
      });
    } catch (error) {
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { accessToken, refreshToken } = response.data.data;

      await Keychain.setGenericPassword('access_token', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      const profileResponse = await api.get('/user/profile');

      set({
        user: profileResponse.data.data,
        isAuthenticated: true,
      });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
      await Keychain.resetGenericPassword();
      await AsyncStorage.removeItem('refreshToken');

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('Logout error:', error);
      throw error;
    }
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data.data;

      await Keychain.setGenericPassword('access_token', accessToken);
    } catch (error) {
      await Keychain.resetGenericPassword();
      await AsyncStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  getUserProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      set({ user: response.data.data });
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  initAuth: async () => {
    set({ isInitializing: true });
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        const response = await api.get('/user/profile');
        set({
          user: response.data.data,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        set({ isInitializing: false });
      }
    } catch (error) {
      console.error('Auth init error:', error);
      await Keychain.resetGenericPassword();
      await AsyncStorage.removeItem('refreshToken');
      set({ isInitializing: false });
    }
  },
}));
