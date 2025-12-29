import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthStore {
    firebaseReady: boolean;
    backendReady: boolean;
    user: User | null;
    authLoading: boolean;
    authLoadingMessage: string;

    setFirebaseReady: (ready: boolean) => void;
    setBackendReady: (ready: boolean) => void;
    setUser: (user: User | null) => void;
    setAuthLoading: (loading: boolean, message?: string) => void;

    reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    firebaseReady: false,
    backendReady: false,
    user: null,
    authLoading: false,
    authLoadingMessage: "",

    setFirebaseReady: (firebaseReady) => set({ firebaseReady }),

    setBackendReady: (backendReady) => set({ backendReady }),

    setUser: (user) => set({ user }),

    setAuthLoading: (authLoading, message) =>
        set((state) => ({
            authLoading,
            authLoadingMessage:
                message !== undefined
                    ? message
                    : authLoading
                    ? state.authLoadingMessage
                    : "",
        })),

    reset: () =>
        set({
            firebaseReady: false,   // Firebase finished, but logged out
            backendReady: false,
            user: null,
            authLoading: false,
            authLoadingMessage: "",
        }),
}));
