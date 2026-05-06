import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  session: Session | null;
  user: User | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  hydrated: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
