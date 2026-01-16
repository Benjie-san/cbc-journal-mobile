import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useJournalStore } from "../../../src/store/journalStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ConfirmModal from "../../../src/components/ConfirmModal";

export default function TrashScreen() {
  const { colors, dark: isDark } = useTheme();
  const { trash, loadTrash, restore, permanentDelete } = useJournalStore();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "restore" | "delete" | "clear";
    id?: string;
  } | null>(null);
  const subtleText = isDark ? "#b9c0cf" : "#555";
  const mutedText = isDark ? "#8e95a6" : "#888";
  const cardBackground = isDark ? colors.card : "#f2f2f2";
  const pendingBadge = isDark ? "#3a2b1f" : "#ffe9d6";
  const pendingText = isDark ? "#f5b26b" : "#9b5c00";
  const clearAllEnabled = useMemo(
    () => trash.some((item) => item.syncStatus !== "pending_permanent_delete"),
    [trash]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTrash();
    } catch (err: any) {
      Alert.alert("Failed to load trash", err?.message ?? "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [loadTrash]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRestore = async (id: string) => {
    try {
      await restore(id);
    } catch (err: any) {
      Alert.alert("Restore failed", err?.message ?? "Unknown error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await permanentDelete(id);
    } catch (err: any) {
      Alert.alert("Delete failed", err?.message ?? "Unknown error");
    }
  };

  const confirmRestore = (id: string) => {
    setConfirmAction({ type: "restore", id });
  };

  const confirmDelete = (id: string) => {
    setConfirmAction({ type: "delete", id });
  };

  const handleClearAll = async () => {
    const deletable = trash.filter(
      (item) => item.syncStatus !== "pending_permanent_delete"
    );
    for (const item of deletable) {
      await handleDelete(item._id);
    }
  };

  const confirmClearAll = () => {
    if (!clearAllEnabled) return;
    setConfirmAction({ type: "clear" });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Trash",
          headerRight: () => (
            <Pressable
              onPress={confirmClearAll}
              disabled={!clearAllEnabled}
              style={({ pressed }) => [
                styles.headerAction,
                { opacity: !clearAllEnabled ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.text} />
              <Text style={[styles.headerActionText, { color: colors.text }]}>
                Clear all
              </Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={trash}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: mutedText }]}>Trash is empty.</Text>
        }
        renderItem={({ item }) => {
          const preview =
            item.content?.observation ||
            item.content?.question ||
            item.content?.application ||
            item.content?.prayer ||
            "";
          const isDeleting = item.syncStatus === "pending_permanent_delete";

          return (
            <Pressable
              style={[
                styles.card,
                { backgroundColor: cardBackground },
                isDeleting && styles.cardPending,
              ]}
              onPress={isDeleting ? undefined : () => confirmRestore(item._id)}
              onLongPress={isDeleting ? undefined : () => confirmDelete(item._id)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {item.title || "Untitled Entry"}
                </Text>
                {isDeleting ? (
                  <View style={[styles.badge, { backgroundColor: pendingBadge }]}>
                    <Text style={[styles.badgeText, { color: pendingText }]}>
                      Deleting...
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.preview, { color: subtleText }]}>
                {preview ? preview.slice(0, 100) : "No content."}
              </Text>
            </Pressable>
          );
        }}
      />
      <ConfirmModal
        visible={!!confirmAction}
        title={
          confirmAction?.type === "restore"
            ? "Restore entry?"
            : confirmAction?.type === "delete"
            ? "Delete permanently?"
            : "Delete all permanently?"
        }
        message={
          confirmAction?.type === "restore"
            ? "This will move the entry back to your journal list."
            : confirmAction?.type === "delete"
            ? "This cannot be undone."
            : "This will permanently delete all items in trash."
        }
        cancelText="Cancel"
        confirmText={
          confirmAction?.type === "restore"
            ? "Restore"
            : confirmAction?.type === "delete"
            ? "Delete"
            : "Delete all"
        }
        destructive={confirmAction?.type !== "restore"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (!action) return;
          if (action.type === "restore" && action.id) {
            void handleRestore(action.id);
          }
          if (action.type === "delete" && action.id) {
            void handleDelete(action.id);
          }
          if (action.type === "clear") {
            void handleClearAll();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  listContent: { paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardPending: { opacity: 0.75 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "600" },
  preview: { marginTop: 6 },
  empty: { textAlign: "center", marginTop: 40 },
  headerAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerActionText: { fontSize: 13, fontWeight: "600" },
});
