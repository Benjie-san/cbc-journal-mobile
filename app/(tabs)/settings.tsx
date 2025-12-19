import { View, Button, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { useJournalStore } from "../../src/store/journalStore";

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
    <View style={{ padding: 16 }}>
      <Button title="Log out" onPress={handleLogout} />
    </View>
  );
}
