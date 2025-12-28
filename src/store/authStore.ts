import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthStore {
    firebaseReady: boolean;
    backendReady: boolean;
    user: User | null;
    authLoading: boolean;

    setFirebaseReady: (ready: boolean) => void;
    setBackendReady: (ready: boolean) => void;
    setUser: (user: User | null) => void;
    setAuthLoading: (loading: boolean) => void;

    reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    firebaseReady: false,
    backendReady: false,
    user: null,
    authLoading: false,

    setFirebaseReady: (firebaseReady) => set({ firebaseReady }),

    setBackendReady: (backendReady) => set({ backendReady }),

    setUser: (user) => set({ user }),

    setAuthLoading: (authLoading) => set({ authLoading }),

    reset: () =>
        set({
            firebaseReady: false,   // Firebase finished, but logged out
            backendReady: false,
            user: null,
            authLoading: false,
        }),
}));
