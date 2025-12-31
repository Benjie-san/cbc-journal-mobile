import { useState } from "react";
import { Link, router } from "expo-router";
import { View, Text, StyleSheet, TextInput, Pressable, Image, Alert, Modal } from "react-native";
import {
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { linkPendingGoogleCredential, signInWithGoogle } from "../../src/api/google";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { apiPost } from "../../src/api/client";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { ACCENT_COLOR } from "../../src/theme";
import { setSecureItem } from "../../src/storage/secureStorage";

export default function AuthIndex() {
    const { colors, dark: isDark } = useTheme();
    const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const mutedText = isDark ? "#8e95a6" : "#777";
    const termsUrl =
        "https://docs.google.com/document/d/e/2PACX-1vS3HysRRoUx8PQHZOfmlB53dVtR3N_fgZVZyffwu7Z1xpNSTBjVa0-gAZre--ZRFinD3HW4CWw9sM3F/pub";
    const privacyUrl =
        "https://docs.google.com/document/d/e/2PACX-1vRofzPRbnlf0IeXpO72xloSU52A8dSqs-gBpSMSrGv5K0tYiLAyIxJF2ILN0-dBmXzfSuFkMRNiuyy2/pub";
    const openLegal = (title: string, url: string) => {
        router.push({ pathname: "/legal", params: { title, url } });
    };

    const exchangeBackendToken = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Missing Firebase user");
        const idToken = await user.getIdToken(true);
        const data = await apiPost("/auth", { idToken }, false);
        const token = data?.token;
        if (!token) throw new Error("No backend token received");
        await setSecureItem("backendToken", token);
    };

    const loginWithEmail = async () => {
        try {
            setAuthLoading(true, "Signing in...");
            await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = auth.currentUser;
            if (user && !user.emailVerified) {
                await sendEmailVerification(user);
                Alert.alert(
                    "Verify your email",
                    "We sent a verification link to your email. Please verify to continue."
                );
                return;
            }
            if (user) {
                await linkPendingGoogleCredential(user);
            }
            await exchangeBackendToken();
        } catch (err: any) {
            Alert.alert("Login Error", err?.message ?? "Unable to sign in");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleForgotPassword = () => {
        setResetEmail(email.trim());
        setShowResetModal(true);
    };

    const handleSendReset = async () => {
        if (!resetEmail.trim()) {
            Alert.alert("Forgot Password", "Enter your email first.");
            return;
        }
        setShowResetModal(false);
        try {
            setAuthLoading(true, "Processing...");
            await sendPasswordResetEmail(auth, resetEmail.trim());
            Alert.alert("Email sent", "Check your inbox to reset your password.");
        } catch (err: any) {
            Alert.alert("Reset failed", err?.message ?? "Unable to send reset email.");
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
            <Pressable onPress={handleForgotPassword}>
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

        <Text style={[styles.legalText, { color: mutedText }]}>
            By continuing, you agree to the{" "}
            <Text style={styles.legalLink} onPress={() => openLegal("Terms of Service", termsUrl)}>
                Terms
            </Text>{" "}
            and{" "}
            <Text style={styles.legalLink} onPress={() => openLegal("Privacy Policy", privacyUrl)}>
                Privacy Policy
            </Text>
            .
        </Text>

        <Link href="/(auth)/signup" asChild>
            <Pressable style={styles.signUpWrap}>
                <Text style={[styles.signUpText, { color: mutedText }]}>
                    Don&apos;t have an account yet?{" "}
                    <Text style={styles.signUpLink}>Sign up</Text>
                </Text>
            </Pressable>
        </Link>
        <Modal
            visible={showResetModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowResetModal(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Forgot Password
                    </Text>
                    <Text style={[styles.modalBody, { color: mutedText }]}>
                        Enter the email linked to your account.
                    </Text>
                    <TextInput
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        placeholder="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor={mutedText}
                        style={[
                            styles.resetInput,
                            { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
                        ]}
                    />
                    <View style={styles.modalActions}>
                        <Pressable
                            style={[styles.modalButton, styles.modalButtonGhost]}
                            onPress={() => setShowResetModal(false)}
                        >
                            <Text style={[styles.modalButtonText, { color: mutedText }]}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.modalButton, styles.modalButtonPrimary]}
                            onPress={handleSendReset}
                        >
                            <Text style={styles.modalButtonPrimaryText}>Send</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
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
    legalText: { textAlign: "center", fontSize: 12, marginTop: 12 },
    legalLink: { color: ACCENT_COLOR, fontWeight: "600" },
    signUpWrap: { marginTop: 18, alignItems: "center" },
    signUpText: { fontSize: 12 },
    signUpLink: { color: "#0C3591", fontWeight: "600" },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    modalCard: {
        width: "100%",
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
    modalBody: { fontSize: 14, marginBottom: 12 },
    resetInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
    },
    modalButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    modalButtonGhost: { backgroundColor: "transparent" },
    modalButtonPrimary: { backgroundColor: ACCENT_COLOR },
    modalButtonDisabled: { opacity: 0.5 },
    modalButtonText: { fontWeight: "600" },
    modalButtonPrimaryText: { color: "#fff", fontWeight: "600" },
});
