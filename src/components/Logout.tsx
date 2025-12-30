import { Button, View } from "react-native";
import { router } from "expo-router";
import { auth } from "../firebase/config";
import { useJournalStore } from "../store/journalStore";
import { useAuthStore } from "../store/authStore";
import { useStreakStore } from "../store/streakStore";
import { clearLocalJournals } from "../db/localDb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteSecureItem } from "../storage/secureStorage";
import { apiPost } from "../api/client";
import { logDebug } from "../utils/logger";

export default function LogoutComponent(){
    const resetStore = useJournalStore((state) => state.reset);
    const resetAuth = useAuthStore((state) => state.reset);
    const resetStreak = useStreakStore((state) => state.reset);

    const logout = async () => {
        try {
            await apiPost("/auth/revoke", {}, true, 6000);
        } catch (err) {
            logDebug("Revoke sessions failed:", err);
        }
        await auth.signOut();
        await deleteSecureItem("backendToken");
        await AsyncStorage.removeItem("authToken");
        await clearLocalJournals();
        resetStore();
        await resetStreak();
        resetAuth();
        router.replace("/(auth)");
    };

    return (
        <View>
            <Button title="Logout" onPress={logout} />
        </View>
    );
}
