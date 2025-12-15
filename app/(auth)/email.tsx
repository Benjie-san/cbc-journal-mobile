import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";
import { router } from "expo-router";

export default function EmailAuthScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const login = async () => {
        try {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace("/(tabs)");
        } catch (err: any) {
        Alert.alert("Login Error", err.message);
        }
    };

    const signup = async () => {
        try {
        await createUserWithEmailAndPassword(auth, email, password);
        router.replace("/(tabs)");
        } catch (err: any) {
        Alert.alert("Signup Error", err.message);
        }
    };

    return (
        <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 20, marginBottom: 10 }}>Email Login</Text>

        <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
            value={email}
            onChangeText={setEmail}
        />

        <TextInput
            placeholder="Password"
            secureTextEntry
            style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
            value={password}
            onChangeText={setPassword}
        />

        <Button title="Login" onPress={login} />
        <View style={{ height: 10 }} />
        <Button title="Create Account" onPress={signup} />
        </View>
    );
}
