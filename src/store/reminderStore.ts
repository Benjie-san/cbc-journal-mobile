import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

type ReminderState = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setTime: (hour: number, minute: number) => Promise<void>;
  scheduleNextOccurrence: () => Promise<void>;
};

const REMINDER_KEY = "dailyReminder";
const REMINDER_TITLE = "Journal Reminder";
const REMINDER_DATA = { type: "dailyReminder" };

const persist = async (state: {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
}) => {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(state));
};

const getNextTriggerDate = (hour: number, minute: number) => {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target;
};

const scheduleNext = async (hour: number, minute: number) => {
  const triggerDate = getNextTriggerDate(hour, minute);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: "Time to write today's journal entry.",
      data: REMINDER_DATA,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: "default",
    },
  });
};

const cancelExistingReminders = async (notificationId?: string | null) => {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matches = scheduled.filter(
    (item) => item.content?.title === REMINDER_TITLE
  );
  await Promise.all(
    matches.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
};

export const useReminderStore = create<ReminderState>((set, get) => ({
  enabled: false,
  hour: 6,
  minute: 0,
  notificationId: null,
  hydrated: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({
          enabled: !!parsed.enabled,
          hour: Number.isFinite(parsed.hour) ? parsed.hour : 6,
          minute: Number.isFinite(parsed.minute) ? parsed.minute : 0,
          notificationId: parsed.notificationId ?? null,
        });
      } catch {
        // ignore corrupt data
      }
    }
    set({ hydrated: true });
  },
  setEnabled: async (enabled) => {
    if (enabled) {
      const perms = await Notifications.getPermissionsAsync();
      if (!perms.granted) {
        const request = await Notifications.requestPermissionsAsync();
        if (!request.granted) {
          set({ enabled: false });
          return false;
        }
      }
      const state = get();
      const next = {
        ...state,
        enabled: true,
      };
      set(next);
      await persist({
        enabled: true,
        hour: next.hour,
        minute: next.minute,
        notificationId: next.notificationId,
      });
      await get().scheduleNextOccurrence();
      return true;
    }

    const state = get();
    await cancelExistingReminders(state.notificationId);
    const next = {
      ...state,
      enabled: false,
      notificationId: null,
    };
    set(next);
    await persist({
      enabled: false,
      hour: next.hour,
      minute: next.minute,
      notificationId: null,
    });
    return true;
  },
  setTime: async (hour, minute) => {
    const state = get();
    const safeHour = Math.min(Math.max(hour, 0), 23);
    const safeMinute = Math.min(Math.max(minute, 0), 59);
    const next = {
      ...state,
      hour: safeHour,
      minute: safeMinute,
    };
    set(next);
    await persist({
      enabled: next.enabled,
      hour: next.hour,
      minute: next.minute,
      notificationId: next.notificationId,
    });
    if (next.enabled) {
      await get().scheduleNextOccurrence();
    }
  },
  scheduleNextOccurrence: async () => {
    const state = get();
    if (!state.enabled) return;
    await cancelExistingReminders(state.notificationId);
    const id = await scheduleNext(state.hour, state.minute);
    const next = { ...state, notificationId: id };
    set(next);
    await persist({
      enabled: next.enabled,
      hour: next.hour,
      minute: next.minute,
      notificationId: next.notificationId,
    });
  },
}));
