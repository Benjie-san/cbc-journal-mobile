import { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useJournalStore } from "../../src/store/journalStore";
import { useRouter } from "expo-router";

export default function JournalListScreen() {
  const router = useRouter();

  const {
    journals,
    loadJournals,
    softDelete,
  } = useJournalStore();

  useEffect(() => {
    loadJournals();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={journals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No journal entries yet.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/journal/edit",
                params: { id: item._id },
              })
            }
            onLongPress={() => softDelete(item._id)}
          >
            <Text style={styles.title}>
              {item.title || "Untitled Entry"}
            </Text>
            <Text style={styles.preview}>
              {item.content?.observation?.slice(0, 80) || "—"}
            </Text>
          </Pressable>
        )}
      />

      {/* Floating Create Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/journal/create")}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "600" },
  preview: { marginTop: 6, color: "#555" },
  empty: { textAlign: "center", marginTop: 40, color: "#888" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: { color: "white", fontSize: 28, fontWeight: "600" },
});
