import { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, StyleSheet, Pressable } from "react-native";
import {
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    sendEmailVerification,
} from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { signInWithGoogle } from "../../src/api/google";
import { useAuthStore } from "../../src/store/authStore";
import { router } from "expo-router";
import { ACCENT_COLOR } from "../../src/theme";

export default function SignupScreen() {
    const { colors, dark: isDark } = useTheme();
    const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const mutedText = isDark ? "#8e95a6" : "#777";
    const okColor = isDark ? "#5bd186" : "#2f9a4c";
    const warnColor = isDark ? "#f97066" : "#a33";
    const termsUrl =
        "https://docs.google.com/document/d/e/2PACX-1vS3HysRRoUx8PQHZOfmlB53dVtR3N_fgZVZyffwu7Z1xpNSTBjVa0-gAZre--ZRFinD3HW4CWw9sM3F/pub";
    const privacyUrl =
        "https://docs.google.com/document/d/e/2PACX-1vRofzPRbnlf0IeXpO72xloSU52A8dSqs-gBpSMSrGv5K0tYiLAyIxJF2ILN0-dBmXzfSuFkMRNiuyy2/pub";
    const openLegal = (title: string, url: string) => {
        router.push({ pathname: "/legal", params: { title, url } });
    };

    const passwordChecks = useMemo(() => {
        const hasMinLength = pass.length >= 8;
        const hasLetter = /[A-Za-z]/.test(pass);
        const hasNumber = /\d/.test(pass);
        const matches = pass.length > 0 && pass === confirmPass;
        return { hasMinLength, hasLetter, hasNumber, matches };
    }, [pass, confirmPass]);

    const canSubmit =
        passwordChecks.hasMinLength &&
        passwordChecks.hasLetter &&
        passwordChecks.hasNumber &&
        passwordChecks.matches &&
        acceptTerms;

    const signUp = async () => {
        try {
        if (!canSubmit) {
            Alert.alert("Invalid password", "Please check the requirements.");
            return;
        }
        const trimmedEmail = email.trim();
        setAuthLoading(true, "Signing up...");
        const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
        if (methods.includes("google.com")) {
            Alert.alert(
                "Use Google Sign-in",
                "This email is linked to Google. Please sign up with Google instead."
            );
            return;
        }
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
        await sendEmailVerification(credential.user);
        Alert.alert(
            "Verify your email",
            "We sent a verification link to your email. Please verify to continue."
        );
        router.replace("/(auth)/verify-email");
        } catch (err: any) {
        Alert.alert("Error", err.message);
        } finally {
        setAuthLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ height: 20 }} />

        <Text style={[styles.title, { color: colors.text, fontSize: 28, }]}>Sign up</Text>
        <View style={{ height: 10 }} />
        <TextInput
            value={email}
            onChangeText={setEmail}
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
            ]}
            placeholder="Email"
            placeholderTextColor={mutedText}
            keyboardType="email-address"
            autoCapitalize="none"
        />

        <View style={[styles.passwordRow, { borderColor: inputBorder, backgroundColor: inputBackground }]}>
            <TextInput
                value={pass}
                secureTextEntry={!showPass}
                onChangeText={setPass}
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={mutedText}
            />
            <Pressable
                onPress={() => setShowPass((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={showPass ? "Hide password" : "Show password"}
                style={styles.eyeButton}
            >
                <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={mutedText}
                />
            </Pressable>
        </View>

        <View style={[styles.passwordRow, { borderColor: inputBorder, backgroundColor: inputBackground }]}>
            <TextInput
                value={confirmPass}
                secureTextEntry={!showConfirm}
                onChangeText={setConfirmPass}
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={mutedText}
            />
            <Pressable
                onPress={() => setShowConfirm((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
                style={styles.eyeButton}
            >
                <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={mutedText}
                />
            </Pressable>
        </View>

        <View style={styles.rules}>
            <Text style={{ color: passwordChecks.hasMinLength ? okColor : warnColor }}>
                At least 8 characters
            </Text>
            <Text style={{ color: passwordChecks.hasLetter ? okColor : warnColor }}>
                Contains a letter
            </Text>
            <Text style={{ color: passwordChecks.hasNumber ? okColor : warnColor }}>
                Contains a number
            </Text>
            <Text style={{ color: passwordChecks.matches ? okColor : warnColor }}>
                Passwords match
            </Text>
        </View>

        <View style={styles.termsRow}>
            <Pressable
                onPress={() => setAcceptTerms((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptTerms }}
            >
                <View
                    style={[
                        styles.checkbox,
                        { borderColor: inputBorder, backgroundColor: acceptTerms ? "#0C3591" : "transparent" },
                    ]}
                >
                    {acceptTerms ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                </View>
            </Pressable>
            <Text style={[styles.termsText, { color: mutedText }]}>
                I agree to the{" "}
                <Text
                    style={styles.termsLink}
                    onPress={() => openLegal("Terms of Service", termsUrl)}
                >
                    Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                    style={styles.termsLink}
                    onPress={() => openLegal("Privacy Policy", privacyUrl)}
                >
                    Privacy Policy
                </Text>
                .
            </Text>
        </View>
        <Text style={[styles.privacyNote, { color: mutedText }]}>
            Philippines Data Privacy Act (RA 10173): You can request access, correction, or deletion of your data.{" "}
            <Text
                style={styles.termsLink}
                onPress={() => openLegal("Privacy Policy", privacyUrl)}
            >
                Learn more
            </Text>
            .
        </Text>

        <View style={{ height: 10 }} />
        
        <Pressable
            style={[styles.signUpButton, !canSubmit && styles.signUpDisabled]}
            onPress={signUp}
            disabled={!canSubmit}
        >
            <Text style={styles.signUpText}>Sign up</Text>
        </Pressable>

        <Text style={[styles.orText, { color: mutedText }]}>or</Text>

        <GoogleSigninButton
            style={{ width: "100%", height: 48 }}
            size={GoogleSigninButton.Size.Wide}
            color={isDark ? GoogleSigninButton.Color.Light : GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
        />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24 },
    backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
    input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 14 },
    passwordRow: {
        borderWidth: 1,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        marginBottom: 14,
    },
    passwordInput: { flex: 1, paddingVertical: 10 },
    eyeButton: { paddingLeft: 8, paddingVertical: 6 },
    rules: { marginBottom: 14, gap: 4 },
    termsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    termsText: { fontSize: 12 },
    privacyNote: { fontSize: 11, marginBottom: 16 },
    termsLink: { color: ACCENT_COLOR, fontWeight: "600" },
    signUpButton: {
        backgroundColor: "#0C3591",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
    },
    signUpDisabled: { opacity: 0.5 },
    signUpText: { color: "#fff", fontWeight: "600" },
    orText: { textAlign: "center", marginVertical: 14 },
});
