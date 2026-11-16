import { create } from 'zustand';
import { UserProfile } from '../../domain/models/auth.model';
import { api } from '@/shared/services/api';

interface AuthStore {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authTab: 'login' | 'register';

  // Actions
  setAuthModalOpen: (open: boolean, tab?: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('unibeam_token'),
  isAuthenticated: false,
  isLoading: false,
  isAuthModalOpen: false,
  authTab: 'login',

  setAuthModalOpen: (open, tab = 'login') => {
    set({ isAuthModalOpen: open, authTab: tab });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.login({ email, password });
      if (res.success && res.data) {
        localStorage.setItem('unibeam_token', res.data.token);
        set({
          token: res.data.token,
          user: res.data.user,
          isAuthenticated: true,
          isAuthModalOpen: false,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await api.register({ email, password, name });
      if (res.success && res.data) {
        localStorage.setItem('unibeam_token', res.data.token);
        set({
          token: res.data.token,
          user: res.data.user,
          isAuthenticated: true,
          isAuthModalOpen: false,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('unibeam_token');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('unibeam_token');
    if (!token) return;

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        set({
          user: res.data,
          isAuthenticated: true,
        });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    }
  },
}));
