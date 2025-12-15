import { useEffect, useState } from "react";
import { View, TextInput, Button, ScrollView, StyleSheet } from "react-native";
import { useJournalStore } from "../../src/store/journalStore";
import { useRouter } from "expo-router";

export default function JournalEditor({
    mode,
    id,
    }: {
    mode: "create" | "edit";
    id?: string;
    }) {
    const router = useRouter();
    const { journals, createJournal, updateJournal } = useJournalStore();

    const existing = journals.find((j) => j._id === id);

    const [title, setTitle] = useState(existing?.title ?? "");
    const [content, setContent] = useState({
        question: existing?.content.question ?? "",
        observation: existing?.content.observation ?? "",
        application: existing?.content.application ?? "",
        prayer: existing?.content.prayer ?? "",
    });

    const onSave = async () => {
        if (mode === "create") {
        await createJournal({ title, content });
        } else if (id) {
        await updateJournal(id, { title, content });
        }
        router.back();
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
        <TextInput
            style={styles.title}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
        />

        {Object.entries(content).map(([key, value]) => (
            <TextInput
            key={key}
            style={styles.textarea}
            placeholder={key.toUpperCase()}
            multiline
            value={value}
            onChangeText={(text) =>
                setContent((prev) => ({ ...prev, [key]: text }))
            }
            />
        ))}

        <Button title="Save Entry" onPress={onSave} />
        </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    title: {
        fontSize: 18,
        fontWeight: "600",
        borderBottomWidth: 1,
        marginBottom: 16,
        padding: 8,
    },
    textarea: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        minHeight: 100,
        textAlignVertical: "top",
    },
});
