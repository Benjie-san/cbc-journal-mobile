import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/config";

export default function SignupScreen() {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");

    const signUp = async () => {
        try {
        await createUserWithEmailAndPassword(auth, email, pass);
        Alert.alert("Account created!");
        } catch (err: any) {
        Alert.alert("Error", err.message);
        }
    };

    return (
        <View style={{ padding: 20 }}>
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

        <Button title="Sign Up" onPress={signUp} />
        </View>
    );
}
