import { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { router } from "expo-router";
import { apiPost } from "../../src/api/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { useAuthStore } from "../../src/store/authStore";
import { linkPendingGoogleCredential } from "../../src/api/google";
import { setSecureItem } from "../../src/storage/secureStorage";

export default function EmailAuthScreen() {
    const { colors, dark: isDark } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const mutedText = isDark ? "#8e95a6" : "#777";

    const exchangeBackendToken = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Missing Firebase user");
        const idToken = await user.getIdToken(true);
        const data = await apiPost("/auth", { idToken }, false);
        const token = data?.token;
        if (!token) throw new Error("No backend token received");
        await setSecureItem("backendToken", token);
    };

    const login = async () => {
        try {
        setAuthLoading(true, "Signing in...");
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        if (user) {
            await linkPendingGoogleCredential(user);
        }
        await exchangeBackendToken();
        router.replace("/(tabs)");
        } catch (err: any) {
        Alert.alert("Login Error", err.message);
        } finally {
        setAuthLoading(false);
        }
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Email Login</Text>

        <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
            ]}
            placeholderTextColor={mutedText}
            value={email}
            onChangeText={setEmail}
        />

        <TextInput
            placeholder="Password"
            secureTextEntry
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
                styles.inputSpacing,
            ]}
            placeholderTextColor={mutedText}
            value={password}
            onChangeText={setPassword}
        />

        <Button title="Login" onPress={login} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, marginBottom: 10 },
    input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 },
    inputSpacing: { marginBottom: 20 },
});
