import { Link } from "expo-router";
import { View, Text, Button } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import { auth } from "../../src/firebase/config";
import { signInWithGoogle } from "../../src/api/google";
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

export default function AuthIndex() {
    return (
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome</Text>

        <View style={{ height: 10 }} />

        <Link href="/(auth)/email" asChild>
            <Button title="Login with Email" />
        </Link>

        <View style={{ height: 10 }} />

        <GoogleSigninButton
            style={{ width: '100%', height: 48 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
        />


        {/* <Link href="/(auth)/signup" asChild>
            <Button title="Create Account" />
        </Link> */}
        </View>
    );
}
