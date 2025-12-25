import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

type ReminderState = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
  oneOffId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setTime: (hour: number, minute: number) => Promise<void>;
};

const REMINDER_KEY = "dailyReminder";
const REMINDER_TITLE = "Journal Reminder";
const CATCH_UP_DELAY_SECONDS = 30;

const persist = async (state: {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
  oneOffId: string | null;
}) => {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(state));
};

const scheduleDaily = async (hour: number, minute: number) => {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: "Time to write today's journal entry.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      repeats: true,
      channelId: "default",
    },
  });
};

const scheduleOneOff = async (fireDate: Date) => {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: REMINDER_TITLE,
      body: "Time to write today's journal entry.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: "default",
    },
  });
};

const getOneOffDate = (hour: number, minute: number) => {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (now <= target) {
    return target;
  }
  return new Date(now.getTime() + CATCH_UP_DELAY_SECONDS * 1000);
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
  oneOffId: null,
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
          oneOffId: parsed.oneOffId ?? null,
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
      await cancelExistingReminders(state.notificationId);
      const id = await scheduleDaily(state.hour, state.minute);
      const oneOffId = await scheduleOneOff(
        getOneOffDate(state.hour, state.minute)
      );
      const next = {
        enabled: true,
        hour: state.hour,
        minute: state.minute,
        notificationId: id,
        oneOffId,
      };
      set(next);
      await persist(next);
      return true;
    }

    const state = get();
    await cancelExistingReminders(state.notificationId);
    const next = {
      enabled: false,
      hour: state.hour,
      minute: state.minute,
      notificationId: null,
      oneOffId: null,
    };
    set(next);
    await persist(next);
    return true;
  },
  setTime: async (hour, minute) => {
    const state = get();
    const safeHour = Math.min(Math.max(hour, 0), 23);
    const safeMinute = Math.min(Math.max(minute, 0), 59);
    let notificationId = state.notificationId;
    let oneOffId = state.oneOffId;
    if (state.enabled) {
      await cancelExistingReminders(notificationId);
      notificationId = await scheduleDaily(safeHour, safeMinute);
      oneOffId = await scheduleOneOff(getOneOffDate(safeHour, safeMinute));
    }
    const next = {
      enabled: state.enabled,
      hour: safeHour,
      minute: safeMinute,
      notificationId,
      oneOffId,
    };
    set(next);
    await persist(next);
  },
}));
