import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "planYear";

interface PlanStore {
  selectedYear: number;
  hydrated: boolean;
  hydrate: (fallbackYear: number, allowedYears: number[]) => Promise<void>;
  setSelectedYear: (year: number) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set) => ({
  selectedYear: new Date().getFullYear(),
  hydrated: false,
  hydrate: async (fallbackYear, allowedYears) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? Number(stored) : NaN;
      const next = allowedYears.includes(parsed) ? parsed : fallbackYear;
      set({ selectedYear: next, hydrated: true });
    } catch {
      set({ selectedYear: fallbackYear, hydrated: true });
    }
  },
  setSelectedYear: async (year) => {
    set({ selectedYear: year });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(year));
    } catch {
      // ignore storage errors
    }
  },
}));
