import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAuthStore } from "../../src/store/authStore";

export default function AuthLayout() {
    const { colors } = useTheme();
    const authLoading = useAuthStore((state) => state.authLoading);

    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                }}
            />
            {authLoading ? (
                <View style={styles.overlay}>
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.text, { color: colors.text }]}>
                            Signing in...
                        </Text>
                    </View>
                </View>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    card: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    text: { fontSize: 14, fontWeight: "600" },
});
