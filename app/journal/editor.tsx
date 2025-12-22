import { useEffect, useState, useRef } from "react";
import { TextInput, Button, ScrollView, StyleSheet } from "react-native";
import { useJournalStore } from "../../src/store/journalStore";
import { JournalEntry } from "../../src/types/Journal";
import { useRouter } from "expo-router";

type EditorProps =
    | { mode: "create"; initialScriptureRef?: string }
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
    const [scriptureRef, setScriptureRef] = useState(
        props.mode === "create" ? props.initialScriptureRef ?? "" : ""
    );
    const [tagsText, setTagsText] = useState("");
    const [tags, setTags] = useState<string[]>([]);
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
        setScriptureRef(existing.scriptureRef ?? "");
        setTags(existing.tags ?? []);
        setTagsText((existing.tags ?? []).join(", "));
        setContent({
            question: existing.content.question ?? "",
            observation: existing.content.observation ?? "",
            application: existing.content.application ?? "",
            prayer: existing.content.prayer ?? "",
        });

        initialized.current = true;
    }, [existing?._id]);

    const onChangeField = (field: keyof typeof content, value: string) => {
        setContent(prev => {
            const next = {
                ...prev,
                [field]: value,
            };

            if (props.mode === "edit") {
                autosaveJournal(props.id, {
                    title,
                    scriptureRef,
                    tags,
                    content: next,
                });
            }

            return next;
        });
    };

    const onChangeTitle = (value: string) => {
        setTitle(value);
        if (props.mode === "edit") {
            autosaveJournal(props.id, {
                title: value,
                scriptureRef,
                tags,
                content,
            });
        }
    };

    const onChangeScriptureRef = (value: string) => {
        setScriptureRef(value);
        if (props.mode === "edit") {
            autosaveJournal(props.id, {
                title,
                scriptureRef: value,
                tags,
                content,
            });
        }
    };

    const onChangeTags = (value: string) => {
        setTagsText(value);
        const nextTags = value
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean);
        setTags(nextTags);
        if (props.mode === "edit") {
            autosaveJournal(props.id, {
                title,
                scriptureRef,
                tags: nextTags,
                content,
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
            scriptureRef,
            tags,
            content,
        });

        // Redirect to edit after create
        router.replace(`./edit/${entry._id}`);
        } else {
        await updateJournal(props.id, {
            title,
            scriptureRef,
            tags,
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
                onChangeText={onChangeTitle}
            />

            <TextInput
                style={styles.scriptureRef}
                placeholder="Scripture reference"
                value={scriptureRef}
                onChangeText={onChangeScriptureRef}
            />

            <TextInput
                style={styles.tags}
                placeholder="Tags (comma-separated)"
                value={tagsText}
                onChangeText={onChangeTags}
                autoCapitalize="none"
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
    scriptureRef: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    tags: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
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
