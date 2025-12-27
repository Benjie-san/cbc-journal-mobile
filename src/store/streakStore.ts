import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost } from "../api/client";
import type { JournalEntry } from "../types/Journal";

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastJournalDate: string | null;
  hydrated: boolean;
  source: "unknown" | "server" | "local";
  hydrate: () => Promise<void>;
  bootstrapFromServer: (data: {
    currentStreak?: number;
    longestStreak?: number;
    lastJournalDate?: string | null;
  }) => Promise<void>;
  recordEntry: (date?: string) => Promise<void>;
  recalculateFromEntries: (entries: JournalEntry[]) => Promise<void>;
  syncToServer: () => Promise<void>;
  reset: () => Promise<void>;
};

const STREAK_KEY = "streakStats";
const STREAK_TIMEOUT_MS = 2000;

const toLocalDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const diffDays = (from: string, to: string) => {
  const fromDate = fromDateKey(from);
  const toDate = fromDateKey(to);
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const computeStreaks = (entries: JournalEntry[]) => {
  const dateSet = new Set<string>();
  entries.forEach((entry) => {
    if (entry.deleted) return;
    const rawDate = entry.createdAt ?? entry.updatedAt;
    if (!rawDate) return;
    dateSet.add(toLocalDateKey(rawDate));
  });

  const dates = Array.from(dateSet).sort();
  if (!dates.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastJournalDate: null,
    };
  }

  let longest = 1;
  let currentRun = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1];
    const next = dates[i];
    if (diffDays(prev, next) === 1) {
      currentRun += 1;
    } else {
      longest = Math.max(longest, currentRun);
      currentRun = 1;
    }
  }
  longest = Math.max(longest, currentRun);

  const todayKey = toLocalDateKey(new Date());
  const lastJournalDate = dates[dates.length - 1];
  const gap = diffDays(lastJournalDate, todayKey);
  let currentStreak = 0;
  if (gap <= 1) {
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i -= 1) {
      if (diffDays(dates[i], dates[i + 1]) === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak: longest,
    lastJournalDate,
  };
};

const persist = async (state: {
  currentStreak: number;
  longestStreak: number;
  lastJournalDate: string | null;
}) => {
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state));
};

export const useStreakStore = create<StreakState>((set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  lastJournalDate: null,
  hydrated: false,
  source: "unknown",
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const currentStreak = parsed.currentStreak ?? 0;
        const longestStreak = parsed.longestStreak ?? 0;
        const lastJournalDate = parsed.lastJournalDate ?? null;
        const source =
          lastJournalDate || currentStreak > 0 || longestStreak > 0
            ? "local"
            : "unknown";
        set({
          currentStreak,
          longestStreak,
          lastJournalDate,
          source,
        });
      } catch {
        // ignore corrupt data
      }
    }
    set({ hydrated: true });
  },
  bootstrapFromServer: async (data) => {
    const state = get();
    if (!state.hydrated) {
      await get().hydrate();
    }
    if (state.lastJournalDate) return;
    const next = {
      currentStreak: data.currentStreak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      lastJournalDate: data.lastJournalDate ?? null,
    };
    set({ ...next, source: "server" });
    await persist(next);
  },
  recordEntry: async (date) => {
    const entryDate = toLocalDateKey(date ?? new Date());
    const state = get();
    let nextCurrent = state.currentStreak;
    if (!state.lastJournalDate) {
      nextCurrent = 1;
    } else {
      const gap = diffDays(state.lastJournalDate, entryDate);
      if (gap === 0) {
        nextCurrent = state.currentStreak;
      } else if (gap === 1) {
        nextCurrent = state.currentStreak + 1;
      } else if (gap > 1) {
        nextCurrent = 1;
      }
    }

    const next = {
      currentStreak: nextCurrent,
      longestStreak: Math.max(state.longestStreak, nextCurrent),
      lastJournalDate: entryDate,
    };
    set({ ...next, source: "local" });
    await persist(next);
    void get().syncToServer();
  },
  recalculateFromEntries: async (entries) => {
    const next = computeStreaks(entries);
    const state = get();
    if (
      state.currentStreak === next.currentStreak &&
      state.longestStreak === next.longestStreak &&
      state.lastJournalDate === next.lastJournalDate
    ) {
      return;
    }
    const source = entries.length ? "local" : state.source;
    set({ ...next, source });
    await persist(next);
    if (entries.length) {
      void get().syncToServer();
    }
  },
  syncToServer: async () => {
    const state = get();
    if (!state.hydrated || state.source !== "local") return;
    try {
      await apiPost(
        "/me/streak",
        {
          currentStreak: state.currentStreak,
          longestStreak: state.longestStreak,
          lastJournalDate: state.lastJournalDate,
        },
        true,
        STREAK_TIMEOUT_MS
      );
    } catch {
      // ignore sync failures; offline-first
    }
  },
  reset: async () => {
    set({
      currentStreak: 0,
      longestStreak: 0,
      lastJournalDate: null,
      hydrated: true,
      source: "unknown",
    });
    await AsyncStorage.removeItem(STREAK_KEY);
  },
}));
