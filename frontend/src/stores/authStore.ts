import { create } from 'zustand';
import type { User } from '../api/endpoints';

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('lims_token') : null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') localStorage.setItem('lims_token', token);
    set({ user, token });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('lims_token');
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lims_token') : null;
    set({ token: token || null });
  },
}));
