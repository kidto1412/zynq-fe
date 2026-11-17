import { create } from 'zustand';
import { UserProfile } from '../../domain/models/auth.model';
import { api } from '@/shared/services/api';

interface AuthStore {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authTab: 'login' | 'register';

  // Actions
  setAuthModalOpen: (open: boolean, tab?: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  enableHotspotGuestMode: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('unibeam_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem('unibeam_token'),
  isAuthenticated: !!localStorage.getItem('unibeam_token'),
  isOfflineGuest: false,
  isLoading: false,
  isAuthModalOpen: false,
  authTab: 'login',

  setAuthModalOpen: (open, tab = 'login') => {
    set({ isAuthModalOpen: open, authTab: tab });
  },

  enableHotspotGuestMode: () => {
    const guestUser: UserProfile = {
      id: 'hotspot-guest',
      email: 'hotspot@offline.local',
      name: 'Offline Hotspot User',
      plan: 'FREE',
    };
    set({
      user: guestUser,
      isAuthenticated: true,
      isOfflineGuest: true,
      isAuthModalOpen: false,
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.login({ email, password });
      if (res.success && res.data) {
        localStorage.setItem('unibeam_token', res.data.token);
        localStorage.setItem('unibeam_user', JSON.stringify(res.data.user));
        set({
          token: res.data.token,
          user: res.data.user,
          isAuthenticated: true,
          isOfflineGuest: false,
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
        localStorage.setItem('unibeam_user', JSON.stringify(res.data.user));
        set({
          token: res.data.token,
          user: res.data.user,
          isAuthenticated: true,
          isOfflineGuest: false,
          isAuthModalOpen: false,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('unibeam_token');
    localStorage.removeItem('unibeam_user');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isOfflineGuest: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('unibeam_token');
    if (!token) return;

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        localStorage.setItem('unibeam_user', JSON.stringify(res.data));
        set({
          user: res.data,
          isAuthenticated: true,
        });
      } else {
        get().logout();
      }
    } catch {
      // If offline or network error, keep offline session if token exists
      if (!navigator.onLine) {
        console.log('[Auth] Operating in offline mode with cached token');
      } else {
        // Only log out if it's confirmed invalid session, otherwise keep cached user
        const cachedUser = getStoredUser();
        if (cachedUser) {
          set({ user: cachedUser, isAuthenticated: true });
        }
      }
    }
  },
}));
