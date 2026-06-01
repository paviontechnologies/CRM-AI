import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  subscription: string;
  usedLeadCredits: number;
  planCredits: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  org: Org | null;
  role: string | null;
  setAuth: (token: string, user: User, org: Org, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      org: null,
      role: null,
      setAuth: (token, user, org, role) => {
        localStorage.setItem('token', token);
        set({ token, user, org, role });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, org: null, role: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
