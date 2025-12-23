import { useEffect, useMemo, useState, useRef } from "react";
import {
    Alert,
    Button,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useJournalStore } from "../../src/store/journalStore";
import { JournalEntry } from "../../src/types/Journal";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../../src/api/client";

type EditorProps =
    | { mode: "create"; initialScriptureRef?: string }
    | { mode: "edit"; id: string };

type JournalVersion = {
    _id: string;
    version: number;
    createdAt: string;
    snapshot: {
        title?: string;
        scriptureRef?: string;
        content?: JournalEntry["content"];
        tags?: string[];
    };
};

export default function JournalEditor(props: EditorProps) {
    const router = useRouter();
    const {
        journals,
        createJournal,
        updateJournal,
        autosaveJournal,
        saving,
        conflict,
        clearConflict,
        applyServerEntry,
        resolveConflictKeepMine,
        replaceJournal,
    } = useJournalStore();

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
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [versions, setVersions] = useState<JournalVersion[]>([]);
    const [conflictVisible, setConflictVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const conflictForEntry = useMemo(() => {
        if (!conflict || props.mode !== "edit") return null;
        return conflict.id === props.id ? conflict : null;
    }, [conflict, props.id, props.mode]);

    useEffect(() => {
        if (conflictForEntry) {
            setConflictVisible(true);
        }
    }, [conflictForEntry]);

    const onChangeField = (field: keyof typeof content, value: string) => {
        setContent(prev => {
            const next = {
                ...prev,
                [field]: value,
            };

            if (props.mode === "edit" && !conflictForEntry) {
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
        if (props.mode === "edit" && !conflictForEntry) {
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
        if (props.mode === "edit" && !conflictForEntry) {
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
        if (props.mode === "edit" && !conflictForEntry) {
            autosaveJournal(props.id, {
                title,
                scriptureRef,
                tags: nextTags,
                content,
            });
        }
    };

    const openHistory = async () => {
        if (props.mode !== "edit") return;
        setHistoryOpen(true);
        setHistoryLoading(true);
        try {
            const data = await apiGet(`/journals/${props.id}/versions`);
            setVersions(data ?? []);
        } catch (err: any) {
            Alert.alert("Failed to load history", err?.message ?? "Unknown error");
        } finally {
            setHistoryLoading(false);
        }
    };

    const applySnapshot = (snapshot: JournalVersion["snapshot"]) => {
        const nextContent = snapshot?.content ?? {
            question: "",
            observation: "",
            application: "",
            prayer: "",
        };
        const nextTags = snapshot?.tags ?? [];

        setTitle(snapshot?.title ?? "");
        setScriptureRef(snapshot?.scriptureRef ?? "");
        setTags(nextTags);
        setTagsText(nextTags.join(", "));
        setContent({
            question: nextContent.question ?? "",
            observation: nextContent.observation ?? "",
            application: nextContent.application ?? "",
            prayer: nextContent.prayer ?? "",
        });
    };

    const restoreVersion = async (version: JournalVersion) => {
        if (props.mode !== "edit") return;
        const snapshot = version?.snapshot;
        if (!snapshot) return;
        try {
            const restored = await apiPost(
                `/journals/${props.id}/versions/${version.version}/restore`,
                {}
            );
            replaceJournal(restored);
            applySnapshot(snapshot);
            clearConflict();
        } catch (err: any) {
            Alert.alert("Restore failed", err?.message ?? "Unknown error");
            return;
        }
        setHistoryOpen(false);
    };

    const refreshEntry = async () => {
        if (props.mode !== "edit") return;
        setRefreshing(true);
        try {
            const entry = await apiGet(`/journals/${props.id}`);
            replaceJournal(entry);
            applySnapshot({
                title: entry.title,
                scriptureRef: entry.scriptureRef,
                tags: entry.tags,
                content: entry.content,
            });
            clearConflict();
        } catch (err: any) {
            Alert.alert("Refresh failed", err?.message ?? "Unknown error");
        } finally {
            setRefreshing(false);
        }
    };

    const handleUseServer = () => {
        if (!conflictForEntry || props.mode !== "edit") return;
        const server = conflictForEntry.serverEntry;
        applyServerEntry(props.id, server, conflictForEntry.serverVersion);
        applySnapshot(server);
        setConflictVisible(false);
        clearConflict();
    };

    const handleKeepMine = async () => {
        if (!conflictForEntry || props.mode !== "edit") return;
        await resolveConflictKeepMine(
            props.id,
            {
                title,
                scriptureRef,
                tags,
                content,
            },
            conflictForEntry.serverVersion
        );
        setConflictVisible(false);
        clearConflict();
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
        const ok = await updateJournal(props.id, {
            title,
            scriptureRef,
            tags,
            content,
        });
        if (ok) {
            router.back();
        }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                props.mode === "edit" ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshEntry}
                    />
                ) : undefined
            }
        >
            {props.mode === "edit" ? (
                <Pressable style={styles.historyButton} onPress={openHistory}>
                    <Text style={styles.historyText}>View History</Text>
                </Pressable>
            ) : null}
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
        <Modal
            visible={historyOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setHistoryOpen(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Version History</Text>
                    {historyLoading ? (
                        <Text style={styles.modalSubtle}>Loading...</Text>
                    ) : versions.length ? (
                        <ScrollView style={styles.modalList}>
                            {versions.map((version) => (
                                <View key={version._id} style={styles.versionRow}>
                                    <View style={styles.versionInfo}>
                                        <Text style={styles.versionTitle}>
                                            Version {version.version}
                                        </Text>
                                        <Text style={styles.versionMeta}>
                                            {new Date(version.createdAt).toLocaleString()}
                                        </Text>
                                        <Text style={styles.versionSnippet} numberOfLines={1}>
                                            {version.snapshot?.title || "Untitled Entry"}
                                        </Text>
                                    </View>
                                    <Pressable
                                        style={[
                                            styles.versionAction,
                                            existing?.version === version.version &&
                                                styles.versionActionDisabled,
                                        ]}
                                        onPress={() => restoreVersion(version)}
                                        disabled={existing?.version === version.version}
                                    >
                                        <Text style={styles.versionActionText}>
                                            {existing?.version === version.version ? "Current" : "Restore"}
                                        </Text>
                                    </Pressable>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.modalSubtle}>No history yet.</Text>
                    )}
                    <Pressable
                        style={styles.modalClose}
                        onPress={() => setHistoryOpen(false)}
                    >
                        <Text style={styles.modalCloseText}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
        <Modal
            visible={conflictVisible}
            animationType="fade"
            transparent
            onRequestClose={() => setConflictVisible(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Version Conflict</Text>
                    <Text style={styles.modalSubtle}>
                        This entry was updated elsewhere. Choose which version to keep.
                    </Text>
                    <View style={styles.conflictSection}>
                        <Text style={styles.conflictLabel}>Server version</Text>
                        <Text style={styles.conflictText}>
                            {conflictForEntry?.serverEntry?.title || "Untitled Entry"}
                        </Text>
                    </View>
                    <View style={styles.conflictSection}>
                        <Text style={styles.conflictLabel}>Your version</Text>
                        <Text style={styles.conflictText}>
                            {title || "Untitled Entry"}
                        </Text>
                    </View>
                    <View style={styles.conflictActions}>
                        <Pressable style={styles.conflictButton} onPress={handleUseServer}>
                            <Text style={styles.conflictButtonText}>Use Server</Text>
                        </Pressable>
                        <Pressable style={styles.conflictButton} onPress={handleKeepMine}>
                            <Text style={styles.conflictButtonText}>Keep Mine</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 16 },
    historyButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: "#f2f2f2",
        marginBottom: 12,
    },
    historyText: { fontWeight: "600", color: "#111" },
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        padding: 20,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        maxHeight: "80%",
    },
    modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    modalSubtle: { color: "#666", marginBottom: 12 },
    modalList: { marginBottom: 12 },
    versionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingVertical: 10,
    },
    versionInfo: { flex: 1, marginRight: 12 },
    versionTitle: { fontWeight: "600", color: "#111" },
    versionMeta: { color: "#777", fontSize: 12, marginTop: 2 },
    versionSnippet: { color: "#444", marginTop: 4 },
    versionAction: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#2f6fed",
    },
    versionActionDisabled: {
        backgroundColor: "#9db5ee",
    },
    versionActionText: { color: "#fff", fontWeight: "600" },
    modalClose: {
        alignSelf: "flex-end",
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    modalCloseText: { color: "#2f6fed", fontWeight: "600" },
    conflictSection: { marginBottom: 10 },
    conflictLabel: { color: "#666", fontSize: 12, marginBottom: 4 },
    conflictText: { fontWeight: "600", color: "#111" },
    conflictActions: { flexDirection: "row", gap: 8, marginTop: 8 },
    conflictButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#2f6fed",
        alignItems: "center",
    },
    conflictButtonText: { color: "#fff", fontWeight: "600" },
});
