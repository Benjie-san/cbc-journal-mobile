import { Link } from "expo-router";
import { View, Text, Button, StyleSheet } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import { auth } from "../../src/firebase/config";
import { signInWithGoogle } from "../../src/api/google";
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";

export default function AuthIndex() {
    const { colors, dark: isDark } = useTheme();
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>

        <View style={{ height: 10 }} />

        <Link href="/(auth)/email" asChild>
            <Button title="Login with Email" />
        </Link>

        <View style={{ height: 10 }} />

        <GoogleSigninButton
            style={{ width: '100%', height: 48 }}
            size={GoogleSigninButton.Size.Wide}
            color={isDark ? GoogleSigninButton.Color.Light : GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
        />

        <View style={{ height: 12 }} />

        <Link href="/(auth)/signup" asChild>
            <Button title="Create Account with Email" />
        </Link>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center" },
    title: { fontSize: 24, marginBottom: 20 },
});
