import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "themePreference";

interface ThemeStore {
  theme: ThemeMode;
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  hydrated: false,
  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem(THEME_KEY, theme);
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      set({ theme: stored });
    }
    set({ hydrated: true });
  },
}));
