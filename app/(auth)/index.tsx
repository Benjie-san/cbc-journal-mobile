import { useState } from "react";
import { Link } from "expo-router";
import { View, Text, Button, StyleSheet, TextInput, Pressable, Image, Alert } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { signInWithGoogle } from "../../src/api/google";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { apiPost } from "../../src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";

export default function AuthIndex() {
    const { colors, dark: isDark } = useTheme();
    const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
        await AsyncStorage.setItem("backendToken", token);
    };

    const loginWithEmail = async () => {
        try {
            setAuthLoading(true);
            await signInWithEmailAndPassword(auth, email.trim(), password);
            await exchangeBackendToken();
        } catch (err: any) {
            Alert.alert("Login Error", err?.message ?? "Unable to sign in");
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    
        <View style={styles.logoWrap}>
            <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
        <View style={{ height: 20 }} />
        <View style={styles.form}>
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
            <View style={[styles.passwordRow, { borderColor: inputBorder, backgroundColor: inputBackground }]}>
                <TextInput
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    style={[styles.passwordInput, { color: colors.text }]}
                    placeholderTextColor={mutedText}
                    value={password}
                    onChangeText={setPassword}
                />
                <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    style={styles.eyeButton}
                >
                    <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={mutedText}
                    />
                </Pressable>
            </View>
            <Pressable onPress={() => Alert.alert("Forgot Password", "Coming soon.")}>
                <Text style={[styles.forgot, { color: mutedText }]}>Forgot Password?</Text>
            </Pressable>

            <Pressable style={styles.signInButton} onPress={loginWithEmail}>
                <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
        </View>

        <Text style={[styles.orText, { color: mutedText }]}>or</Text>

        <GoogleSigninButton
            style={{ width: '100%', height: 48 }}
            size={GoogleSigninButton.Size.Wide}
            color={isDark ? GoogleSigninButton.Color.Light : GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
        />

        <Link href="/(auth)/signup" asChild>
            <Pressable style={styles.signUpWrap}>
                <Text style={[styles.signUpText, { color: mutedText }]}>
                    Don&apos;t have an account yet?{" "}
                    <Text style={styles.signUpLink}>Sign up</Text>
                </Text>
            </Pressable>
        </Link>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: "center" },
    kicker: { fontSize: 12, letterSpacing: 0.5, marginBottom: 12 },
    logoWrap: { alignItems: "center", marginBottom: 16 },
    logo: { width: 150, height: 150 },
    form: { width: "100%", gap: 12, marginBottom: 18 },
    input: { borderWidth: 1, padding: 10, borderRadius: 8 },
    passwordRow: {
        borderWidth: 1,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    passwordInput: { flex: 1, paddingVertical: 10 },
    eyeButton: { paddingLeft: 8, paddingVertical: 6 },
    forgot: { fontSize: 12, alignSelf: "flex-end", marginTop: 4 },
    signInButton: {
        marginTop: 8,
        backgroundColor: "#0C3591",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    signInText: { color: "#fff", fontWeight: "600" },
    orText: { textAlign: "center", marginBottom: 14 },
    signUpWrap: { marginTop: 18, alignItems: "center" },
    signUpText: { fontSize: 12 },
    signUpLink: { color: "#0C3591", fontWeight: "600" },
});
