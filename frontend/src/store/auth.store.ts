import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

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
  // The session exchange returns identity only; these are filled in by the
  // /auth/me call the dashboard layout makes on mount.
  subscription?: string;
  usedLeadCredits?: number;
  planCredits?: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  org: Org | null;
  role: string | null;
  setAuth: (token: string, user: User, org: Org | null, role: string) => void;
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
        // Without this the Supabase session survives and the next /login visit
        // would sign the user straight back in.
        void supabase.auth.signOut();
        set({ token: null, user: null, org: null, role: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
