import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { auth } from "../../src/firebase/config";
import { sendEmailVerification } from "firebase/auth";
import { apiGet, apiPost } from "../../src/api/client";
import { useAuthStore } from "../../src/store/authStore";
import { useJournalStore } from "../../src/store/journalStore";
import { useStreakStore } from "../../src/store/streakStore";
import { router } from "expo-router";
import { ACCENT_COLOR } from "../../src/theme";
import { setSecureItem } from "../../src/storage/secureStorage";

export default function VerifyEmailScreen() {
    const { colors, dark: isDark } = useTheme();
    const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
    const setBackendReady = useAuthStore((state) => state.setBackendReady);
    const [resendCooldown, setResendCooldown] = useState(0);
    const mutedText = isDark ? "#8e95a6" : "#777";

    const exchangeBackendToken = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Missing Firebase user");
        const idToken = await user.getIdToken(true);
        const data = await apiPost("/auth", { idToken }, false);
        const token = data?.token;
        if (!token) throw new Error("No backend token received");
        await setSecureItem("backendToken", token);
        return token;
    };

    const proceedIfVerified = useCallback(async (showAlert = false) => {
        const user = auth.currentUser;
        if (!user) {
            if (showAlert) {
                Alert.alert("Missing user", "Please log in again.");
                router.replace("/(auth)");
            }
            return;
        }
        let startedLoading = false;
        try {
            await user.reload();
            if (!user.emailVerified) {
                if (showAlert) {
                    Alert.alert("Not verified yet", "Please check your email and verify.");
                }
                return;
            }
            setAuthLoading(true, "Signing in...");
            startedLoading = true;
            await exchangeBackendToken();
            const me = await apiGet("/me", true, 6000);
            await useStreakStore.getState().bootstrapFromServer(me);
            setBackendReady(true);
            await useJournalStore.getState().syncJournals();
            router.replace("/(tabs)");
        } catch (err: any) {
            if (showAlert) {
                Alert.alert("Verification failed", err?.message ?? "Try again.");
            }
        } finally {
            if (startedLoading) {
                setAuthLoading(false);
            }
        }
    }, [exchangeBackendToken, setAuthLoading, setBackendReady]);

    useEffect(() => {
        void proceedIfVerified(false);
        const interval = setInterval(() => {
            if (AppState.currentState === "active") {
                void proceedIfVerified(false);
            }
        }, 5000);
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                void proceedIfVerified(false);
            }
        });
        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [proceedIfVerified]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleResend = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            setResendCooldown(60);
            await sendEmailVerification(user);
            Alert.alert("Email sent", "Check your inbox for the verification link.");
        } catch (err: any) {
            Alert.alert("Resend failed", err?.message ?? "Try again later.");
            setResendCooldown(0);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>
                    Verify your email
                </Text>
                <Text style={[styles.body, { color: mutedText }]}>
                    We sent a verification link to your email. Please open it to
                    continue.
                </Text>
                <Pressable
                    style={styles.linkButton}
                    onPress={handleResend}
                    disabled={resendCooldown > 0}
                >
                    <Text style={[styles.linkText, { color: resendCooldown > 0 ? mutedText : ACCENT_COLOR }]}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: "center" },
    card: { padding: 16, borderRadius: 12, gap: 12 },
    title: { fontSize: 18, fontWeight: "600" },
    body: { fontSize: 14, lineHeight: 20 },
    linkButton: { alignItems: "center" },
    linkText: { fontSize: 13, fontWeight: "600" },
});
