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
import { ACCENT_COLOR } from "../../src/theme";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type EditorProps =
    | { mode: "create"; initialScriptureRef?: string; fromBrp?: boolean }
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
    const { colors, dark: isDark } = useTheme();
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
            ? journals.find(j => j._id === props.id || j.localId === props.id)
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
    const subtleText = isDark ? "#b9c0cf" : "#555";
    const mutedText = isDark ? "#8e95a6" : "#777";
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const chipBackground = isDark ? "#1f2430" : "#f2f2f2";
    const modalBackground = isDark ? "#151a24" : "#fff";
    const dividerColor = isDark ? "#2a3142" : "#eee";
    const disabledAction = isDark ? "#2a3d6b" : "#9db5ee";

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
        if (!existing?.serverId) {
            Alert.alert("Not synced yet", "This entry is only saved locally.");
            return;
        }
        setRefreshing(true);
        try {
            const entry = await apiGet(`/journals/${existing.serverId}`);
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

    const formatStatus = (entry?: JournalEntry) => {
        switch (entry?.syncStatus) {
            case "pending_create":
            case "pending_update":
                return "Saved locally";
            case "pending_delete":
                return "Pending delete";
            case "pending_restore":
                return "Pending restore";
            case "pending_permanent_delete":
                return "Pending removal";
            case "conflict":
                return "Conflict";
            default:
                return "Synced";
        }
    };

    const formatTime = (value?: string) => {
        if (!value) return "";
        try {
            return new Date(value).toLocaleString();
        } catch {
            return value;
        }
    };

    const handlePickFromBrp = () => {
        if (props.mode !== "create") return;
        router.replace({
            pathname: "/(tabs)/brp",
            params: { picker: "1" },
        });
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
        router.replace({
            pathname: "/journal/edit",
            params: { id: entry._id },
        });
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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
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
                <View style={styles.headerRow}>
                    <Pressable
                        style={[styles.historyButton, { backgroundColor: chipBackground }]}
                        onPress={openHistory}
                    >
                        <Text style={[styles.historyText, { color: colors.text }]}>
                            View History
                        </Text>
                    </Pressable>
                    <View style={styles.statusBlock}>
                        <Text style={[styles.statusText, { color: subtleText }]}>
                            {formatStatus(existing)}
                        </Text>
                        {existing?.lastSavedAt ? (
                            <Text style={[styles.statusSubtext, { color: mutedText }]}>
                                {formatTime(existing.lastSavedAt)}
                            </Text>
                        ) : null}
                    </View>
                </View>
            ) : null}
            <TextInput
                style={[
                    styles.title,
                    { color: colors.text, borderBottomColor: inputBorder },
                ]}
                placeholder="Title"
                placeholderTextColor={mutedText}
                value={title}
                onChangeText={onChangeTitle}
            />

            <View style={styles.scriptureRow}>
                <TextInput
                    style={[
                        styles.scriptureRef,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                            flex: 1,
                            marginBottom: 0,
                        },
                    ]}
                    placeholder="Scripture reference"
                    placeholderTextColor={mutedText}
                    value={scriptureRef}
                    onChangeText={onChangeScriptureRef}
                />

                {props.mode === "create" && !props.fromBrp ? (
                    <Pressable
                        style={styles.brpInline}
                        onPress={handlePickFromBrp}
                        accessibilityRole="button"
                        accessibilityLabel="Pick from BRP"
                    >
                        <Ionicons name="book-outline" size={16} color="#fff" />
                        <Text style={styles.brpInlineText}>BRP</Text>
                    </Pressable>
                ) : null}
            </View>

            <TextInput
                style={[
                    styles.tags,
                    {
                        backgroundColor: inputBackground,
                        borderColor: inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="Tags (comma-separated)"
                placeholderTextColor={mutedText}
                value={tagsText}
                onChangeText={onChangeTags}
                autoCapitalize="none"
            />

            <TextInput
                style={[
                    styles.textarea,
                    {
                        backgroundColor: inputBackground,
                        borderColor: inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="Question"
                placeholderTextColor={mutedText}
                value={content.question}
                onChangeText={v => onChangeField("question", v)}
                multiline
            />

            <TextInput
                style={[
                    styles.textarea,
                    {
                        backgroundColor: inputBackground,
                        borderColor: inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="Observation"
                placeholderTextColor={mutedText}
                value={content.observation}
                onChangeText={v => onChangeField("observation", v)}
                multiline
            />

            <TextInput
                style={[
                    styles.textarea,
                    {
                        backgroundColor: inputBackground,
                        borderColor: inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="Application"
                placeholderTextColor={mutedText}
                value={content.application}
                onChangeText={v => onChangeField("application", v)}
                multiline
            />

            <TextInput
                style={[
                    styles.textarea,
                    {
                        backgroundColor: inputBackground,
                        borderColor: inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="Prayer"
                placeholderTextColor={mutedText}
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
                <View style={[styles.modalCard, { backgroundColor: modalBackground }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Version History
                    </Text>
                    {historyLoading ? (
                        <Text style={[styles.modalSubtle, { color: mutedText }]}>
                            Loading...
                        </Text>
                    ) : versions.length ? (
                        <ScrollView style={styles.modalList}>
                            {versions.map((version) => (
                                <View
                                    key={version._id}
                                    style={[styles.versionRow, { borderTopColor: dividerColor }]}
                                >
                                    <View style={styles.versionInfo}>
                                        <Text style={[styles.versionTitle, { color: colors.text }]}>
                                            Version {version.version}
                                        </Text>
                                        <Text style={[styles.versionMeta, { color: mutedText }]}>
                                            {new Date(version.createdAt).toLocaleString()}
                                        </Text>
                                        <Text
                                            style={[styles.versionSnippet, { color: subtleText }]}
                                            numberOfLines={1}
                                        >
                                            {version.snapshot?.title || "Untitled Entry"}
                                        </Text>
                                    </View>
                                    <Pressable
                                        style={[
                                            styles.versionAction,
                                            existing?.version === version.version &&
                                                { backgroundColor: disabledAction },
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
                        <Text style={[styles.modalSubtle, { color: mutedText }]}>
                            No history yet.
                        </Text>
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
                <View style={[styles.modalCard, { backgroundColor: modalBackground }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Version Conflict
                    </Text>
                    <Text style={[styles.modalSubtle, { color: mutedText }]}>
                        This entry was updated elsewhere. Choose which version to keep.
                    </Text>
                    <View style={styles.conflictSection}>
                        <Text style={[styles.conflictLabel, { color: mutedText }]}>
                            Server version
                        </Text>
                        <Text style={[styles.conflictText, { color: colors.text }]}>
                            {conflictForEntry?.serverEntry?.title || "Untitled Entry"}
                        </Text>
                    </View>
                    <View style={styles.conflictSection}>
                        <Text style={[styles.conflictLabel, { color: mutedText }]}>
                            Your version
                        </Text>
                        <Text style={[styles.conflictText, { color: colors.text }]}>
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
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 12,
    },
    historyButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    historyText: { fontWeight: "600" },
    statusBlock: { alignItems: "flex-end" },
    statusText: { fontSize: 12, fontWeight: "600" },
    statusSubtext: { fontSize: 11, marginTop: 2 },
    title: {
        fontSize: 18,
        fontWeight: "600",
        borderBottomWidth: 1,
        marginBottom: 16,
        padding: 8,
    },
    scriptureRef: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    scriptureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    brpInline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: ACCENT_COLOR,
    },
    brpInlineText: { color: "#fff", fontWeight: "600", fontSize: 12 },
    tags: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    textarea: {
        borderWidth: 1,
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
        borderRadius: 12,
        padding: 16,
        maxHeight: "80%",
    },
    modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    modalSubtle: { marginBottom: 12 },
    modalList: { marginBottom: 12 },
    versionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        paddingVertical: 10,
    },
    versionInfo: { flex: 1, marginRight: 12 },
    versionTitle: { fontWeight: "600" },
    versionMeta: { fontSize: 12, marginTop: 2 },
    versionSnippet: { marginTop: 4 },
    versionAction: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: ACCENT_COLOR,
    },
    versionActionDisabled: {},
    versionActionText: { color: "#fff", fontWeight: "600" },
    modalClose: {
        alignSelf: "flex-end",
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    modalCloseText: { color: ACCENT_COLOR, fontWeight: "600" },
    conflictSection: { marginBottom: 10 },
    conflictLabel: { fontSize: 12, marginBottom: 4 },
    conflictText: { fontWeight: "600" },
    conflictActions: { flexDirection: "row", gap: 8, marginTop: 8 },
    conflictButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: ACCENT_COLOR,
        alignItems: "center",
    },
    conflictButtonText: { color: "#fff", fontWeight: "600" },
});
