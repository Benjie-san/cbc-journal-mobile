import { useMemo, useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

export default function SignupScreen() {
    const { colors, dark: isDark } = useTheme();
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const mutedText = isDark ? "#8e95a6" : "#777";
    const okColor = isDark ? "#5bd186" : "#2f9a4c";
    const warnColor = isDark ? "#f97066" : "#a33";

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
        passwordChecks.matches;

    const signUp = async () => {
        try {
        if (!canSubmit) {
            Alert.alert("Invalid password", "Please check the requirements.");
            return;
        }
        await createUserWithEmailAndPassword(auth, email, pass);
        Alert.alert("Account created!");
        } catch (err: any) {
        Alert.alert("Error", err.message);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
            ]}
            placeholderTextColor={mutedText}
        />

        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <TextInput
            value={pass}
            secureTextEntry
            onChangeText={setPass}
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
            ]}
            placeholderTextColor={mutedText}
        />

        <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
        <TextInput
            value={confirmPass}
            secureTextEntry
            onChangeText={setConfirmPass}
            style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: colors.text },
            ]}
            placeholderTextColor={mutedText}
        />

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

        <Button title="Sign Up" onPress={signUp} disabled={!canSubmit} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    label: { marginBottom: 6 },
    input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 12 },
    rules: { marginTop: 10, marginBottom: 16, gap: 4 },
});
