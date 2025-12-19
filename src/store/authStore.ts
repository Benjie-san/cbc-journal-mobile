import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthStore {
    firebaseReady: boolean;
    backendReady: boolean;
    user: User | null;

    setFirebaseReady: (ready: boolean) => void;
    setBackendReady: (ready: boolean) => void;
    setUser: (user: User | null) => void;

    reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    firebaseReady: false,
    backendReady: false,
    user: null,

    setFirebaseReady: (firebaseReady) => set({ firebaseReady }),

    setBackendReady: (backendReady) => set({ backendReady }),

    setUser: (user) => set({ user }),

    reset: () =>
        set({
            firebaseReady: false,   // Firebase finished, but logged out
            backendReady: false,
            user: null,
        }),
}));
