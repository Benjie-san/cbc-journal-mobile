
import { View, Button, Alert, Pressable, StyleSheet, Text, Switch, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../../src/firebase/config";
import { useJournalStore } from "../../../src/store/journalStore";
import { useAuthStore } from "../../../src/store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { useThemeStore } from "../../../src/store/themeStore";
import { ACCENT_COLOR } from "../../../src/theme";
import { useReminderStore } from "../../../src/store/reminderStore";
import { useStreakStore } from "../../../src/store/streakStore";
import { clearLocalJournals } from "../../../src/db/localDb";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";

export default function Settings() {
  const resetStore = useJournalStore((state) => state.reset);
  const resetAuth = useAuthStore((state) => state.reset);
  const resetStreak = useStreakStore((state) => state.reset);
  const { colors, dark: navIsDark } = useTheme();
  const themeMode = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = themeMode === "dark";
  const reminderEnabled = useReminderStore((state) => state.enabled);
  const reminderHour = useReminderStore((state) => state.hour);
  const reminderMinute = useReminderStore((state) => state.minute);
  const reminderId = useReminderStore((state) => state.notificationId);
  const setReminderEnabled = useReminderStore((state) => state.setEnabled);
  const setReminderTime = useReminderStore((state) => state.setTime);
  const hydrateReminder = useReminderStore((state) => state.hydrate);
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const longestStreak = useStreakStore((state) => state.longestStreak);
  const [hourText, setHourText] = useState("06");
  const [minuteText, setMinuteText] = useState("00");
  const [isPm, setIsPm] = useState(false);

  useEffect(() => {
    hydrateReminder();
  }, [hydrateReminder]);

  useEffect(() => {
    const hour12 = reminderHour % 12 || 12;
    setHourText(`${hour12}`.padStart(2, "0"));
    setMinuteText(`${reminderMinute}`.padStart(2, "0"));
    setIsPm(reminderHour >= 12);
  }, [reminderHour, reminderMinute]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.multiRemove(["backendToken", "authToken"]);
      await clearLocalJournals();
      resetStore();
      await resetStreak();
      resetAuth();
      router.replace("/(auth)");
    } catch (err: any) {
      Alert.alert("Logout failed", err?.message ?? "Unknown error");
    }
  };

  const handleToggleReminder = async (value: boolean) => {
    const ok = await setReminderEnabled(value);
    if (!ok) {
      Alert.alert(
        "Notifications disabled",
        "Enable notifications in system settings to use reminders."
      );
    }
  };

  const handleSaveReminderTime = async () => {
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      Alert.alert("Invalid time", "Use numbers for hour and minute.");
      return;
    }
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      Alert.alert("Invalid time", "Hour must be 1-12 and minute 0-59.");
      return;
    }
    const baseHour = hour % 12;
    const hour24 = isPm ? baseHour + 12 : baseHour;
    await setReminderTime(hour24, minute);
  };

  const handleTestReminder = async () => {
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      const request = await Notifications.requestPermissionsAsync();
      if (!request.granted) {
        Alert.alert(
          "Notifications disabled",
          "Enable notifications in system settings to use reminders."
        );
        return;
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Journal Reminder (Test)",
        body: "This is a test notification.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
        channelId: "default",
      },
    });
    Alert.alert("Test scheduled", "Background the app to see it in 5 seconds.");
  };

  const formatTriggerTime = (trigger: Notifications.NotificationTrigger | null) => {
    if (!trigger || typeof trigger !== "object") return "Unknown";
    if ("date" in trigger) {
      const rawDate = (trigger as any).date;
      const dateVal = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!Number.isNaN(dateVal.getTime())) {
        return dateVal.toLocaleString();
      }
    }
    if ("value" in trigger) {
      const rawValue = Number((trigger as any).value);
      if (Number.isFinite(rawValue)) {
        const dateVal = new Date(rawValue);
        if (!Number.isNaN(dateVal.getTime())) {
          return dateVal.toLocaleString();
        }
      }
    }
    if ("hour" in trigger && "minute" in trigger) {
      const hour = Number(trigger.hour);
      const minute = Number(trigger.minute);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "Unknown";
      const isPmTime = hour >= 12;
      const hour12 = hour % 12 || 12;
      const minuteText = `${minute}`.padStart(2, "0");
      return `${hour12}:${minuteText} ${isPmTime ? "PM" : "AM"}`;
    }
    return "Unknown";
  };

  const handleShowScheduled = async () => {
    if (!reminderEnabled) {
      Alert.alert("Reminder is off", "Turn it on to schedule notifications.");
      return;
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!scheduled.length) {
      Alert.alert("No reminders scheduled");
      return;
    }
    const byId = reminderId
      ? scheduled.find((item) => item.identifier === reminderId)
      : null;
    const daily = scheduled.find(
      (item) =>
        item.trigger &&
        typeof item.trigger === "object" &&
        "type" in item.trigger &&
        item.trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY
    );
    const oneOff = scheduled.find((item) => {
      if (!item.trigger || typeof item.trigger !== "object") return false;
      if ("type" in item.trigger) {
        return item.trigger.type === Notifications.SchedulableTriggerInputTypes.DATE;
      }
      return "date" in item.trigger;
    });
    const target = byId ?? oneOff ?? daily ?? scheduled[0];
    const timeText = formatTriggerTime(target.trigger ?? null);
    const now = new Date();
    const next = new Date();
    next.setHours(reminderHour, reminderMinute, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const dayLabel =
      next.toDateString() === now.toDateString()
        ? "Today"
        : next.toDateString() ===
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString()
        ? "Tomorrow"
        : next.toLocaleDateString();
    const nextTime = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const lines = [
      `Trigger time: ${timeText}`,
      `Next occurrence: ${dayLabel} at ${nextTime}`,
    ];
    lines.push(`Scheduled count: ${scheduled.length}`);
    scheduled.forEach((item, index) => {
      const triggerType =
        item.trigger && typeof item.trigger === "object" && "type" in item.trigger
          ? String((item.trigger as any).type)
          : "unknown";
      const triggerDetails =
        item.trigger && typeof item.trigger === "object"
          ? JSON.stringify(item.trigger)
          : String(item.trigger);
      lines.push(`${index + 1}. ${triggerType} ${triggerDetails}`);
    });
    if (oneOff?.trigger && typeof oneOff.trigger === "object" && "date" in oneOff.trigger) {
      const rawDate = (oneOff.trigger as any).date;
      const dateVal = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!Number.isNaN(dateVal.getTime())) {
        lines.push(`One-off trigger: ${dateVal.toLocaleString()}`);
      }
    }
    Alert.alert("Scheduled reminder", lines.join("\n"));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Ionicons name="flame-outline" size={18} color={ACCENT_COLOR} />
            <Text style={[styles.streakLabel, { color: colors.text }]}>
              Current streak
            </Text>
            <Text style={[styles.streakValue, { color: colors.text }]}>
              {currentStreak}
            </Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakItem}>
            <Ionicons name="trophy-outline" size={18} color={ACCENT_COLOR} />
            <Text style={[styles.streakLabel, { color: colors.text }]}>
              Longest streak
            </Text>
            <Text style={[styles.streakValue, { color: colors.text }]}>
              {longestStreak}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Daily reminder</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: "#cfcfcf", true: ACCENT_COLOR }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.timeLabel, { color: colors.text }]}>Time</Text>
          <View style={styles.timeInputs}>
            <TextInput
              value={hourText}
              onChangeText={setHourText}
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.timeInput,
                { borderColor: colors.border, color: colors.text },
              ]}
            />
            <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
            <TextInput
              value={minuteText}
              onChangeText={setMinuteText}
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.timeInput,
                { borderColor: colors.border, color: colors.text },
              ]}
            />
            <View
              style={[
                styles.ampmToggle,
                { backgroundColor: navIsDark ? "#1f2430" : "#f2f2f2" },
              ]}
            >
              <Pressable
                style={[
                  styles.ampmButton,
                  !isPm && styles.ampmButtonActive,
                ]}
                onPress={() => setIsPm(false)}
              >
                <Text
                  style={[
                    styles.ampmText,
                    { color: !isPm ? "#fff" : colors.text },
                  ]}
                >
                  AM
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ampmButton,
                  isPm && styles.ampmButtonActive,
                ]}
                onPress={() => setIsPm(true)}
              >
                <Text
                  style={[
                    styles.ampmText,
                    { color: isPm ? "#fff" : colors.text },
                  ]}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.saveButton} onPress={handleSaveReminderTime}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
        <View style={styles.testRow}>
          <Pressable
            style={[styles.testButton, { borderColor: colors.border }]}
            onPress={handleTestReminder}
          >
            <Text style={[styles.testButtonText, { color: colors.text }]}>
              Test now
            </Text>
          </Pressable>
          <Pressable
            style={[styles.testButton, { borderColor: colors.border }]}
            onPress={handleShowScheduled}
          >
            <Text style={[styles.testButtonText, { color: colors.text }]}>
              Show schedule
            </Text>
          </Pressable>
          <Text style={[styles.testHint, { color: colors.border }]}>
            Background the app to see it.
          </Text>
        </View>
      </View>
      <View style={[styles.row, { backgroundColor: colors.card }]}>
        <View style={styles.rowLeft}>
          <Ionicons name="moon-outline" size={20} color={colors.text} />
          <Text style={[styles.rowText, { color: colors.text }]}>Dark mode</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={(value) => setTheme(value ? "dark" : "light")}
          trackColor={{ false: "#cfcfcf", true: ACCENT_COLOR }}
          thumbColor="#ffffff"
        />
      </View>
      <Pressable
        style={[styles.row, { backgroundColor: colors.card }]}
        onPress={() => router.push("/(tabs)/settings/trash")}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="trash-outline" size={20} color={colors.text} />
          <Text style={[styles.rowText, { color: colors.text }]}>Trash</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </Pressable>

      <Button title="Log out" onPress={handleLogout} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  card: {
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakItem: { flex: 1, alignItems: "center", gap: 4 },
  streakLabel: { fontSize: 12, fontWeight: "600" },
  streakValue: { fontSize: 18, fontWeight: "700" },
  streakDivider: { width: 1, height: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { fontSize: 16, fontWeight: "600", color: "#111" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  timeLabel: { fontSize: 14, fontWeight: "600" },
  timeInputs: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    textAlign: "center",
  },
  ampmToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  ampmButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ampmButtonActive: {
    backgroundColor: ACCENT_COLOR,
  },
  ampmText: { fontSize: 12, fontWeight: "600" },
  timeColon: { fontSize: 16, fontWeight: "600" },
  saveButton: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  testButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  testButtonText: { fontSize: 12, fontWeight: "600" },
  testHint: { fontSize: 12 },
});
