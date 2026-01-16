import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ACCENT_COLOR } from "../theme";

type ConfirmModalProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText = "OK",
    cancelText = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const { colors, dark: isDark } = useTheme();
    const mutedText = isDark ? "#8e95a6" : "#777";
    const destructiveColor = isDark ? "#f97066" : "#d92d20";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.backdrop}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {title}
                    </Text>
                    <Text style={[styles.message, { color: mutedText }]}>
                        {message}
                    </Text>
                    <View style={styles.actions}>
                        <Pressable style={styles.button} onPress={onCancel}>
                            <Text style={[styles.buttonText, { color: mutedText }]}>
                                {cancelText}
                            </Text>
                        </Pressable>
                        <Pressable style={styles.button} onPress={onConfirm}>
                            <Text
                                style={[
                                    styles.buttonText,
                                    { color: destructive ? destructiveColor : ACCENT_COLOR },
                                ]}
                            >
                                {confirmText}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        borderRadius: 12,
        padding: 16,
    },
    title: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
    message: { fontSize: 14, lineHeight: 20 },
    actions: {
        marginTop: 16,
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    button: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    buttonText: { fontWeight: "600" },
});
