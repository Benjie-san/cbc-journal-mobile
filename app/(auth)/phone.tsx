import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../src/firebase/config"; // ensure this exports firebase auth instance
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneAuthScreen() {
    const recaptchaVerifierRef = useRef<any>(null);
    const [phone, setPhone] = useState("+63");
    const [codeSent, setCodeSent] = useState(false);
    const [verification, setVerification] = useState<any>(null);
    const [code, setCode] = useState("");

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
        <SafeAreaView style={{ flex: 1, padding: 20 }}>
            {/* Hidden recaptcha container */}
            <View id="recaptcha-container"></View>

            {!codeSent ? (
                <>
                    <Text>Enter Phone Number</Text>
                    <TextInput
                        style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <Button title="Send Code" onPress={sendOtp} />
                </>
            ) : (
                <>
                    <Text>Enter OTP</Text>
                    <TextInput
                        style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}
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
