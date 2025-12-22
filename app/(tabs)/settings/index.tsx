
import { View, Button, Alert, Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../../src/firebase/config";
import { useJournalStore } from "../../../src/store/journalStore";

export default function Settings() {
  const resetStore = useJournalStore((state) => state.reset);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("backendToken");
      resetStore();
      router.replace("/(auth)");
    } catch (err: any) {
      Alert.alert("Logout failed", err?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
        onPress={() => router.push("/(tabs)/settings/trash")}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="trash-outline" size={20} color="#111" />
          <Text style={styles.rowText}>Trash</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </Pressable>

      <Button title="Log out" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { fontSize: 16, fontWeight: "600", color: "#111" },
});
