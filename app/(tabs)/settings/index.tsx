
import { View, Alert, Modal, Pressable, StyleSheet, Text, Switch } from "react-native";
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
import { useStreakStore } from "../../../src/store/streakStore";
import { clearLocalJournals } from "../../../src/db/localDb";
import { useState } from "react";
import { deleteSecureItem } from "../../../src/storage/secureStorage";
import { apiPost } from "../../../src/api/client";
import { logDebug } from "../../../src/utils/logger";

export default function Settings() {
  const resetStore = useJournalStore((state) => state.reset);
  const resetAuth = useAuthStore((state) => state.reset);
  const resetStreak = useStreakStore((state) => state.reset);
  const { colors } = useTheme();
  const themeMode = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = themeMode === "dark";
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const longestStreak = useStreakStore((state) => state.longestStreak);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const revokeSessions = async () => {
    try {
      await apiPost("/auth/revoke", {}, true, 6000);
    } catch (err) {
      logDebug("Revoke sessions failed:", err);
    }
  };

  const handleLogout = async (revokeEverywhere: boolean) => {
    try {
      if (revokeEverywhere) {
        await revokeSessions();
      }
      await signOut(auth);
      await deleteSecureItem("backendToken");
      await AsyncStorage.removeItem("authToken");
      await clearLocalJournals();
      resetStore();
      await resetStreak();
      resetAuth();
      router.replace("/(auth)");
    } catch (err: any) {
      Alert.alert("Logout failed", err?.message ?? "Unknown error");
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
      <Pressable
        style={[styles.row, { backgroundColor: colors.card }]}
        onPress={() => router.push("/(tabs)/settings/tutorial")}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="book-outline" size={20} color={colors.text} />
          <Text style={[styles.rowText, { color: colors.text }]}>
            Tutorial
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </Pressable>
      <Pressable
        style={[styles.row, { backgroundColor: colors.card }]}
        onPress={() => router.push("/(tabs)/settings/about")}
      >
        <View style={styles.rowLeft}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.text}
          />
          <Text style={[styles.rowText, { color: colors.text }]}>About</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </Pressable>
      <Pressable
        style={[styles.row, { backgroundColor: colors.card }]}
        onPress={() => setLogoutModalOpen(true)}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={[styles.rowText, { color: colors.text }]}>Log out</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.border} />
      </Pressable>
      <Modal
        visible={logoutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log out
            </Text>
            <Text style={[styles.modalBody, { color: colors.text }]}>
              Choose how you want to sign out.
            </Text>
            <Pressable
              style={[
                styles.modalAction,
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setLogoutModalOpen(false);
                handleLogout(false);
              }}
            >
              <Text style={[styles.modalActionText, { color: colors.text }]}>
                Log out on this device
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalAction,
                styles.modalActionPrimary,
              ]}
              onPress={() => {
                setLogoutModalOpen(false);
                handleLogout(true);
              }}
            >
              <Text style={styles.modalActionPrimaryText}>
                Log out everywhere
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setLogoutModalOpen(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { fontSize: 14 },
  modalAction: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalActionText: { fontSize: 15, fontWeight: "600" },
  modalActionPrimary: {
    backgroundColor: ACCENT_COLOR,
    borderColor: ACCENT_COLOR,
  },
  modalActionPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  modalCancel: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
});
