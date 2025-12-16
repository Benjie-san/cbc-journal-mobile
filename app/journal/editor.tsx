import { useEffect, useState, useRef } from "react";
import { View, TextInput, Button, ScrollView, StyleSheet } from "react-native";
import { useJournalStore } from "../../src/store/journalStore";
import { JournalEntry } from "../../src/types/Journal";
import { useRouter } from "expo-router";

type EditorProps =
    | { mode: "create" }
    | { mode: "edit"; id: string };

export default function JournalEditor(props: EditorProps) {
    const router = useRouter();
    const {journals, createJournal, updateJournal, autosaveJournal, saving} = useJournalStore();

    const existing: JournalEntry | undefined =
        props.mode === "edit"
            ? journals.find(j => j._id === props.id)
            : undefined;

    // Prevent overwriting user typing on rerenders
    const initialized = useRef(false);

    // LOCAL STATES
    const [title, setTitle] = useState("");
    const [content, setContent] = useState({
        question: "",
        observation: "",
        application: "",
        prayer: "",
    });

    useEffect(() => {
        if (props.mode !== "edit") return;
        if (!existing) return;
        if (initialized.current) return;

        setTitle(existing.title ?? "");
        setContent({
            question: existing.content.question ?? "",
            observation: existing.content.observation ?? "",
            application: existing.content.application ?? "",
            prayer: existing.content.prayer ?? "",
        });

        initialized.current = true;
    }, [existing?._id]);

    const onChangeField = (field: keyof typeof content, value: string) => {
        setContent(prev => ({
            ...prev,
            [field]: value,
        }));

        // Autosave ONLY in edit mode
        if (props.mode === "edit") {
        autosaveJournal(props.id, {
            title,
            content: {
            ...content,
            [field]: value,
            },
        });
        }
    };

    // ─────────────────────────────────────────────
  // Manual save (Create OR Edit)
  // ─────────────────────────────────────────────
    const onSave = async () => {
        if (props.mode === "create") {
        const entry = await createJournal({
            title,
            content,
        });

        // Redirect to edit after create
        router.replace(`./edit/${entry._id}`);
        } else {
        await updateJournal(props.id, {
            title,
            content,
        });

        router.back();
        }
    };

    return (
        <>
        <ScrollView contentContainerStyle={styles.container}>
            <TextInput
                style={styles.title}
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
            />

            <TextInput
                style={styles.textarea}
                placeholder="Question"
                value={content.question}
                onChangeText={v => onChangeField("question", v)}
                multiline
            />

            <TextInput
                style={styles.textarea}
                placeholder="Observation"
                value={content.observation}
                onChangeText={v => onChangeField("observation", v)}
                multiline
            />

            <TextInput
                style={styles.textarea}
                placeholder="Application"
                value={content.application}
                onChangeText={v => onChangeField("application", v)}
                multiline
            />

            <TextInput
                style={styles.textarea}
                placeholder="Prayer"
                value={content.prayer}
                onChangeText={v => onChangeField("prayer", v)}
                multiline
            />
            { props.mode === "create" ?
            <Button
                title={saving ? "Saving..." : "Save"}
                onPress={onSave}
                disabled={saving}
            />
            : null }
        </ScrollView>
        </>
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
