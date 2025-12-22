import { useMemo, useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");

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
        <SafeAreaView style={styles.container}>
        <Text>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            style={{ borderWidth: 1, padding: 10 }}
        />

        <Text>Password</Text>
        <TextInput
            value={pass}
            secureTextEntry
            onChangeText={setPass}
            style={{ borderWidth: 1, padding: 10 }}
        />

        <Text>Confirm Password</Text>
        <TextInput
            value={confirmPass}
            secureTextEntry
            onChangeText={setConfirmPass}
            style={{ borderWidth: 1, padding: 10 }}
        />

        <View style={styles.rules}>
            <Text style={passwordChecks.hasMinLength ? styles.ruleOk : styles.ruleWarn}>
                At least 8 characters
            </Text>
            <Text style={passwordChecks.hasLetter ? styles.ruleOk : styles.ruleWarn}>
                Contains a letter
            </Text>
            <Text style={passwordChecks.hasNumber ? styles.ruleOk : styles.ruleWarn}>
                Contains a number
            </Text>
            <Text style={passwordChecks.matches ? styles.ruleOk : styles.ruleWarn}>
                Passwords match
            </Text>
        </View>

        <Button title="Sign Up" onPress={signUp} disabled={!canSubmit} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    rules: { marginTop: 10, marginBottom: 16, gap: 4 },
    ruleOk: { color: "#2f9a4c" },
    ruleWarn: { color: "#a33" },
});
