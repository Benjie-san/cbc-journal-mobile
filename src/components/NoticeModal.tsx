import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ACCENT_COLOR } from "../theme";

type NoticeModalProps = {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
};

export default function NoticeModal({
    visible,
    title,
    message,
    onClose,
}: NoticeModalProps) {
    const { colors, dark: isDark } = useTheme();
    const mutedText = isDark ? "#8e95a6" : "#777";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {title}
                    </Text>
                    <Text style={[styles.message, { color: mutedText }]}>
                        {message}
                    </Text>
                    <Pressable style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>OK</Text>
                    </Pressable>
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
    button: {
        alignSelf: "flex-end",
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    buttonText: { color: ACCENT_COLOR, fontWeight: "600" },
});
