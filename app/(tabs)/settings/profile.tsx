import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../../src/firebase/config";
import { useJournalStore } from "../../../src/store/journalStore";
import { useAuthStore } from "../../../src/store/authStore";
import { useStreakStore } from "../../../src/store/streakStore";
import { clearLocalJournals } from "../../../src/db/localDb";
import { deleteSecureItem } from "../../../src/storage/secureStorage";
import { apiPost } from "../../../src/api/client";
import { ACCENT_COLOR } from "../../../src/theme";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const resetStore = useJournalStore((state) => state.reset);
  const journals = useJournalStore((state) => state.journals);
  const resetAuth = useAuthStore((state) => state.reset);
  const resetStreak = useStreakStore((state) => state.reset);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const isDeleteMatch = deleteConfirmation.trim().toUpperCase() === "DELETE ACCOUNT";

  const userEmail = auth.currentUser?.email ?? "Unknown";
  const displayName = auth.currentUser?.displayName ?? "";
  const fallbackName = userEmail.includes("@")
    ? userEmail.split("@")[0]
    : "Friend";
  const rawName = displayName.trim() || fallbackName;
  const firstName = rawName
    ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
    : "Friend";

  const totalEntries = useMemo(
    () => journals.filter((entry) => !entry.deleted).length,
    [journals]
  );
  const totalCompleted = useMemo(
    () =>
      journals.filter((entry) => {
        if (entry.deleted) return false;
        const title = (entry.title ?? "").trim();
        const observation = (entry.content?.observation ?? "").trim();
        const application = (entry.content?.application ?? "").trim();
        return !!title && !!observation && !!application;
      }).length,
    [journals]
  );

  const handleDeleteAccount = async () => {
    try {
      await apiPost("/auth/delete", {}, true, 6000);
      await signOut(auth);
      await deleteSecureItem("backendToken");
      await AsyncStorage.removeItem("authToken");
      await clearLocalJournals();
      resetStore();
      await resetStreak();
      resetAuth();
    } catch (err: any) {
      Alert.alert("Delete failed", err?.message ?? "Unable to delete account.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.profileHeader}>
          <Ionicons name="person-circle-outline" size={32} color={colors.text} />
          <View>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {firstName}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.border }]}>
              {userEmail}
            </Text>
          </View>
        </View>
        <View style={[styles.profileRow, { borderTopColor: colors.border }]}>
          <View style={styles.profileItem}>
            <Text style={[styles.profileLabel, { color: colors.border }]}>
              Total entries
            </Text>
            <Text style={[styles.profileValue, { color: colors.text }]}>
              {totalEntries}
            </Text>
          </View>
          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profileItem}>
            <Text style={[styles.profileLabel, { color: colors.border }]}>
              Completed
            </Text>
            <Text style={[styles.profileValue, { color: colors.text }]}>
              {totalCompleted}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={styles.deleteButton}
        onPress={() => setDeleteAccountOpen(true)}
      >
        <Ionicons name="trash-outline" size={18} color="#d92d20" />
        <Text style={styles.deleteButtonText}>Delete account</Text>
      </Pressable>

      <Modal
        visible={deleteAccountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Delete account
            </Text>
            <Text style={[styles.modalBody, { color: colors.text }]}>
              Type DELETE ACCOUNT to confirm. This action is permanent.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="DELETE ACCOUNT"
              placeholderTextColor={colors.border}
              autoCapitalize="characters"
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
            />
            <Pressable
              style={[
                styles.modalAction,
                styles.modalActionPrimary,
                !isDeleteMatch && styles.modalActionDisabled,
              ]}
              onPress={() => {
                if (!isDeleteMatch) return;
                setDeleteAccountOpen(false);
                setDeleteConfirmation("");
                handleDeleteAccount();
              }}
              disabled={!isDeleteMatch}
            >
              <Text style={styles.modalActionPrimaryText}>Delete</Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => {
                setDeleteAccountOpen(false);
                setDeleteConfirmation("");
              }}
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
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileEmail: { fontSize: 12, marginTop: 2 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
    justifyContent: "space-between",
  },
  profileItem: { flex: 1, alignItems: "center", gap: 4 },
  profileLabel: { fontSize: 11, fontWeight: "600" },
  profileValue: { fontSize: 18, fontWeight: "700" },
  profileDivider: { width: 1, height: 30 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f2b3b3",
    backgroundColor: "#fdecea",
  },
  deleteButtonText: { color: "#d92d20", fontWeight: "600" },
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
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalAction: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalActionPrimary: {
    backgroundColor: ACCENT_COLOR,
    borderColor: ACCENT_COLOR,
  },
  modalActionDisabled: { opacity: 0.5 },
  modalActionPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  modalCancel: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
});
