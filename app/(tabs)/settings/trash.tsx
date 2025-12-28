import { useCallback, useState } from "react";
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

export default function TrashScreen() {
  const { colors, dark: isDark } = useTheme();
  const { trash, loadTrash, restore, permanentDelete } = useJournalStore();
  const [refreshing, setRefreshing] = useState(false);
  const subtleText = isDark ? "#b9c0cf" : "#555";
  const mutedText = isDark ? "#8e95a6" : "#888";
  const cardBackground = isDark ? colors.card : "#f2f2f2";

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
    Alert.alert(
      "Restore entry?",
      "This will move the entry back to your journal list.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => handleRestore(id) },
      ]
    );
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete permanently?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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

          return (
            <Pressable
              style={[styles.card, { backgroundColor: cardBackground }]}
              onPress={() => confirmRestore(item._id)}
              onLongPress={() => confirmDelete(item._id)}
            >
              <Text style={[styles.title, { color: colors.text }]}>
                {item.title || "Untitled Entry"}
              </Text>
              <Text style={[styles.preview, { color: subtleText }]}>
                {preview ? preview.slice(0, 100) : "No content."}
              </Text>
            </Pressable>
          );
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
  title: { fontSize: 16, fontWeight: "600" },
  preview: { marginTop: 6 },
  empty: { textAlign: "center", marginTop: 40 },
});
