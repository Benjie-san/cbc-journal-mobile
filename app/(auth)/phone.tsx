import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../src/firebase/config"; // ensure this exports firebase auth instance
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

export default function PhoneAuthScreen() {
    const { colors, dark: isDark } = useTheme();
    const recaptchaVerifierRef = useRef<any>(null);
    const [phone, setPhone] = useState("+63");
    const [codeSent, setCodeSent] = useState(false);
    const [verification, setVerification] = useState<any>(null);
    const [code, setCode] = useState("");
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const mutedText = isDark ? "#8e95a6" : "#777";

    // Initialize invisible reCAPTCHA

    useEffect(() => {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container",{ size: "invisible" },
        
        );
    }, []);

    const sendOtp = async () => {
        try {
            const confirmation = await signInWithPhoneNumber(
                auth,
                phone,
                recaptchaVerifierRef.current
            );

            setVerification(confirmation);
            setCodeSent(true);
            Alert.alert("OTP Sent!");
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const verifyCode = async () => {
        try {
            await verification.confirm(code);

            router.replace("/(tabs)");
        } catch (err: any) {
            Alert.alert("Error", "Invalid OTP");
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Hidden recaptcha container */}
            <View id="recaptcha-container"></View>

            {!codeSent ? (
                <>
                    <Text style={[styles.label, { color: colors.text }]}>
                        Enter Phone Number
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: inputBackground,
                                borderColor: inputBorder,
                                color: colors.text,
                            },
                        ]}
                        placeholderTextColor={mutedText}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <Button title="Send Code" onPress={sendOtp} />
                </>
            ) : (
                <>
                    <Text style={[styles.label, { color: colors.text }]}>
                        Enter OTP
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: inputBackground,
                                borderColor: inputBorder,
                                color: colors.text,
                            },
                        ]}
                        placeholderTextColor={mutedText}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="numeric"
                    />
                    <Button title="Verify" onPress={verifyCode} />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    label: { marginBottom: 6 },
    input: { borderWidth: 1, marginVertical: 10, padding: 10, borderRadius: 8 },
});
