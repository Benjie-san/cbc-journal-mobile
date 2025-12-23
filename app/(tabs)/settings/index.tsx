
import { View, Button, Alert, Pressable, StyleSheet, Text, Switch } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../../src/firebase/config";
import { useJournalStore } from "../../../src/store/journalStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { useThemeStore } from "../../../src/store/themeStore";
import { ACCENT_COLOR } from "../../../src/theme";

export default function Settings() {
  const resetStore = useJournalStore((state) => state.reset);
  const { colors } = useTheme();
  const themeMode = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = themeMode === "dark";

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
