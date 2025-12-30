import { useEffect, useMemo, useState, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
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
import * as Clipboard from "expo-clipboard";
import { Asset } from "expo-asset";

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

type VerseItem = {
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
};

type BibleTranslation = {
    verses: VerseItem[];
};

type TranslationKey = "ASV" | "KJV" | "Tagalog";

const TRANSLATION_ORDER: TranslationKey[] = ["ASV", "KJV", "Tagalog"];

const TRANSLATION_ASSETS: Record<TranslationKey, number> = {
    ASV: require("../../assets/bible/asv.txt"),
    KJV: require("../../assets/bible/kjv.txt"),
    Tagalog: require("../../assets/bible/tagalog.txt"),
};

const TRANSLATION_CACHE = new Map<TranslationKey, BibleTranslation>();
const TRANSLATION_PROMISES = new Map<TranslationKey, Promise<BibleTranslation>>();

const loadTranslation = async (key: TranslationKey) => {
    const cached = TRANSLATION_CACHE.get(key);
    if (cached) return cached;
    const pending = TRANSLATION_PROMISES.get(key);
    if (pending) return pending;

    const asset = Asset.fromModule(TRANSLATION_ASSETS[key]);
    const promise = (async () => {
        if (!asset.localUri) {
            await asset.downloadAsync();
        }
        const uri = asset.localUri ?? asset.uri;
        const response = await fetch(uri);
        const content = await response.text();
        const data = JSON.parse(content) as BibleTranslation;
        TRANSLATION_CACHE.set(key, data);
        TRANSLATION_PROMISES.delete(key);
        return data;
    })();

    TRANSLATION_PROMISES.set(key, promise);
    return promise;
};

const TRANSLATION_INDEX_CACHE = new WeakMap<
    BibleTranslation,
    Map<string, Map<number, VerseItem[]>>
>();

const getTranslationIndex = (translation: BibleTranslation) => {
    const cached = TRANSLATION_INDEX_CACHE.get(translation);
    if (cached) return cached;

    const bookMap = new Map<string, Map<number, VerseItem[]>>();
    translation.verses.forEach((item) => {
        const bookName = item.book_name;
        let chapters = bookMap.get(bookName);
        if (!chapters) {
            chapters = new Map<number, VerseItem[]>();
            bookMap.set(bookName, chapters);
        }
        let verses = chapters.get(item.chapter);
        if (!verses) {
            verses = [];
            chapters.set(item.chapter, verses);
        }
        verses.push(item);
    });

    TRANSLATION_INDEX_CACHE.set(translation, bookMap);
    return bookMap;
};

const normalizeBookName = (book: string) => {
    if (book === "Psalm") return "Psalms";
    return book;
};

const parseBookAndChapter = (value: string) => {
    const cleaned = value.trim().replace(/\s+/g, " ");
    const match = cleaned.match(/^(.*?)(\d+)$/);
    if (!match) return null;
    const book = match[1].trim();
    const chapter = Number.parseInt(match[2], 10);
    if (!book || Number.isNaN(chapter)) return null;
    return { book, chapter };
};

const getPassageLines = (scripture: string, translation: BibleTranslation) => {
    const trimmed = scripture.trim();
    if (!trimmed) return [];

    const parts = trimmed.split(":");
    const leftPart = parts[0]?.trim() ?? "";
    const rightPart = parts[1]?.trim();
    const parsed = parseBookAndChapter(leftPart);
    if (!parsed) return [];

    let startVerse: number | undefined;
    let endVerse: number | undefined;
    if (rightPart) {
        const rangeParts = rightPart
            .split(/[-–]/)
            .map((part) => part.trim())
            .filter(Boolean);
        if (rangeParts[0]) {
            const start = Number.parseInt(rangeParts[0], 10);
            if (!Number.isNaN(start)) {
                startVerse = start;
            }
        }
        if (rangeParts[1]) {
            const end = Number.parseInt(rangeParts[1], 10);
            if (!Number.isNaN(end)) {
                endVerse = end;
            }
        }
    }

    const normalizedBook = normalizeBookName(parsed.book);
    const index = getTranslationIndex(translation);
    const chapterMap = index.get(normalizedBook);
    const verses = chapterMap?.get(parsed.chapter);
    if (!verses?.length) return [];

    const cleanText = (text: string) =>
        text
            .replace(/\u00b6/g, "")
            .replace(/\[|\]/g, "")
            .replace(/[<>]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    if (startVerse == null) {
        return verses.map((item) => `${item.verse} ${cleanText(item.text)}`);
    }

    if (endVerse != null && endVerse >= startVerse) {
        return verses
            .filter((item) => item.verse >= startVerse && item.verse <= endVerse)
            .map((item) => `${item.verse} ${cleanText(item.text)}`);
    }

    const exact = verses.find((item) => item.verse === startVerse);
    return exact ? [`${exact.verse} ${cleanText(exact.text)}`] : [];
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
    const [createSaving, setCreateSaving] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [bibleOpen, setBibleOpen] = useState(false);
    const [translationKey, setTranslationKey] =
        useState<TranslationKey>("ASV");
    const [translationData, setTranslationData] =
        useState<BibleTranslation | null>(null);
    const [bibleLoading, setBibleLoading] = useState(false);
    const [bibleError, setBibleError] = useState<string | null>(null);
    const subtleText = isDark ? "#b9c0cf" : "#555";
    const mutedText = isDark ? "#8e95a6" : "#777";
    const inputBackground = isDark ? "#1a1f2b" : "#fff";
    const inputBorder = isDark ? "#2f3645" : "#ccc";
    const chipBackground = isDark ? "#1f2430" : "#f2f2f2";
    const modalBackground = isDark ? "#151a24" : "#fff";
    const dividerColor = isDark ? "#2a3142" : "#eee";
    const disabledAction = isDark ? "#2a3d6b" : "#9db5ee";
    const isSermonNote =
        scriptureRef.trim().toLowerCase().startsWith("sermon notes");

    const labelText = {
        title: isSermonNote ? "Theme" : "Title",
        question: isSermonNote ? "Question" : "Question",
        observation: isSermonNote ? "Sermon Points" : "Observation",
        application: isSermonNote ? "Propositions" : "Application",
        prayer: isSermonNote ? "Reflection" : "Prayer",
    };

    const placeholderText = {
        title: isSermonNote ? "What is the theme?" : "What is the title?",
        tags: isSermonNote
            ? "Tags (sermon, series, speaker)"
            : "Tags (comma-separated)",
        question: isSermonNote
            ? "Key question from the sermon"
            : "Question",
        observation: isSermonNote
            ? "List the main sermon points"
            : "What are your observations?",
        application: isSermonNote
            ? "Write the main propositions"
            : "How will you apply this?",
        prayer: isSermonNote
            ? "Your reflection or prayer"
            : "Write your prayer...",
    };

    useEffect(() => {
        let cancelled = false;
        if (!bibleOpen) return;
        setBibleLoading(true);
        setBibleError(null);
        setTranslationData(null);
        loadTranslation(translationKey)
            .then((data) => {
                if (cancelled) return;
                setTranslationData(data);
            })
            .catch((err: any) => {
                if (cancelled) return;
                setBibleError(err?.message ?? "Failed to load translation.");
            })
            .finally(() => {
                if (cancelled) return;
                setBibleLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bibleOpen, translationKey]);

    const passageLines = useMemo(() => {
        if (!bibleOpen || !translationData) return [];
        return getPassageLines(scriptureRef, translationData);
    }, [bibleOpen, scriptureRef, translationData]);

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

    const toggleBible = () => {
        setBibleOpen((prev) => !prev);
    };

    const cycleTranslation = () => {
        setTranslationKey((prev) => {
            const index = TRANSLATION_ORDER.indexOf(prev);
            return TRANSLATION_ORDER[(index + 1) % TRANSLATION_ORDER.length];
        });
    };

    const buildShareText = () => {
        const parts: string[] = [];
        const cleanTitle = title.trim();
        const cleanRef = scriptureRef.trim();
        if (cleanTitle) parts.push(cleanTitle);
        if (cleanRef) parts.push(cleanRef);
        const sections: Array<[string, string]> = [
            ["Question", content.question],
            ["Observation", content.observation],
            ["Application", content.application],
            ["Prayer", content.prayer],
        ];
        sections.forEach(([label, value]) => {
            const trimmed = value.trim();
            if (trimmed) {
                parts.push(`${label}\n${trimmed}`);
            }
        });
        const result = parts.join("\n\n").trim();
        if (!result) {
            Alert.alert("Nothing to share", "Add content before sharing.");
            return "";
        }
        return result;
    };

    // ─────────────────────────────────────────────
  // Manual save (Create OR Edit)
  // ─────────────────────────────────────────────
    const onSave = async () => {
        if (props.mode === "create") {
        if (createSaving) return;
        setCreateSaving(true);
        try {
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
        } finally {
            setCreateSaving(false);
        }
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
        <View
            style={[
                styles.topHeader,
                { backgroundColor: colors.background, borderBottomColor: colors.border },
            ]}
        >
            <View style={styles.topHeaderRow}>
                <Pressable
                    style={styles.topHeaderAction}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.topHeaderTitle, { color: colors.text }]}>
                    Journal Entry
                </Text>
                <Pressable
                    style={styles.topHeaderAction}
                    onPress={() => setMenuOpen(true)}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
                </Pressable>
            </View>
        </View>
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
        >
        <ScrollView
            contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
                props.mode === "edit" ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshEntry}
                    />
                ) : undefined
            }
        >
            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Scripture
                </Text>
                <View style={styles.scriptureInlineRow}>
                    <View
                        style={[
                            styles.scriptureRow,
                            { backgroundColor: inputBackground, borderColor: inputBorder },
                        ]}
                    >
                        <TextInput
                            style={[
                                styles.scriptureRef,
                                {
                                    color: colors.text,
                                    flex: 1,
                                },
                            ]}
                        placeholder="Enter a scripture reference"
                            placeholderTextColor={mutedText}
                            value={scriptureRef}
                            onChangeText={onChangeScriptureRef}
                        />

                        <View style={styles.scriptureActions}>
                            {bibleOpen ? (
                                <Pressable
                                    style={styles.translationButton}
                                    onPress={cycleTranslation}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change translation"
                                >
                                    <Text style={styles.translationButtonText}>
                                        {translationKey}
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                style={styles.bibleButton}
                                onPress={toggleBible}
                                accessibilityRole="button"
                                accessibilityLabel="Toggle Bible"
                            >
                                <Ionicons
                                    name={bibleOpen ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={ACCENT_COLOR}
                            />
                        </Pressable>
                    </View>
            
                </View>
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
            </View>
            {bibleOpen ? (
                <View
                    style={[
                        styles.passageCard,
                        {
                            backgroundColor: inputBackground,
                        
                            borderColor: "red",
                            borderWidth: 1,
                        },
                    ]}
                >
                    {bibleLoading ? (
                        <ActivityIndicator size="small" color={ACCENT_COLOR} />
                    ) : bibleError ? (
                        <Text style={[styles.passageEmpty, { color: mutedText }]}>
                            {bibleError}
                        </Text>
                    ) : passageLines.length ? (
                        passageLines.map((line, index) => (
                            <Text
                                key={`${line}-${index}`}
                                style={[styles.passageLine, { color: colors.text }]}
                            >
                                {line}
                            </Text>
                        ))
                    ) : (
                        <Text style={[styles.passageEmpty, { color: mutedText }]}>
                            No verse found.
                        </Text>
                    )}
                </View>
            ) : null}

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {labelText.title}
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.title}
                    placeholderTextColor={mutedText}
                    value={title}
                    onChangeText={onChangeTitle}
                />
            </View>

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Tags
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.tags}
                    placeholderTextColor={mutedText}
                    value={tagsText}
                    onChangeText={onChangeTags}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {labelText.question}
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        styles.questionInput,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.question}
                    placeholderTextColor={mutedText}
                    value={content.question}
                    onChangeText={v => onChangeField("question", v)}
                    multiline
                />
            </View>

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {labelText.observation}
                </Text>
                <TextInput
                    style={[
                        styles.textarea,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.observation}
                    placeholderTextColor={mutedText}
                    value={content.observation}
                    onChangeText={v => onChangeField("observation", v)}
                    multiline
                />
            </View>

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {labelText.application}
                </Text>
                <TextInput
                    style={[
                        styles.textarea,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.application}
                    placeholderTextColor={mutedText}
                    value={content.application}
                    onChangeText={v => onChangeField("application", v)}
                    multiline
                />
            </View>

            <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {labelText.prayer}
                </Text>
                <TextInput
                    style={[
                        styles.textarea,
                        {
                            backgroundColor: inputBackground,
                            borderColor: inputBorder,
                            color: colors.text,
                        },
                    ]}
                    placeholder={placeholderText.prayer}
                    placeholderTextColor={mutedText}
                    value={content.prayer}
                    onChangeText={v => onChangeField("prayer", v)}
                    multiline
                />
            </View>
            {props.mode === "create" ? (
                <Pressable
                    style={[
                        styles.saveButton,
                        (createSaving || saving) && styles.saveButtonDisabled,
                    ]}
                    onPress={onSave}
                    disabled={saving || createSaving}
                >
                    {createSaving || saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </Pressable>
            ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
        <Modal
            visible={menuOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setMenuOpen(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, { backgroundColor: modalBackground }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Menu
                    </Text>
                    <View style={styles.menuList}>
                        <Pressable
                            style={[
                                styles.menuItem,
                                styles.menuItemDivider,
                                { borderBottomColor: dividerColor },
                            ]}
                            onPress={async () => {
                                const text = buildShareText();
                                if (!text) return;
                                setMenuOpen(false);
                                await Share.share({ message: text });
                            }}
                        >
                            <Ionicons name="share-social-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>
                                Share
                            </Text>
                        </Pressable>
                        <Pressable
                            style={styles.menuItem}
                            onPress={async () => {
                                const text = buildShareText();
                                if (!text) return;
                                setMenuOpen(false);
                                await Clipboard.setStringAsync(text);
                                Alert.alert("Copied", "Entry copied to clipboard.");
                            }}
                        >
                            <Ionicons name="copy-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>
                                Copy to Clipboard
                            </Text>
                        </Pressable>
                        {props.mode === "edit" ? (
                            <View
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: dividerColor },
                                ]}
                            >
                                <Ionicons
                                    name="cloud-outline"
                                    size={18}
                                    color={colors.text}
                                />
                                <View style={styles.menuStatus}>
                                    <Text style={[styles.menuText, { color: colors.text }]}>
                                        {formatStatus(existing)}
                                    </Text>
                                    {existing?.lastSavedAt ? (
                                        <Text
                                            style={[
                                                styles.menuSubtext,
                                                { color: mutedText },
                                            ]}
                                        >
                                            {formatTime(existing.lastSavedAt)}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        ) : null}
                    </View>
                    <Pressable
                        style={styles.modalClose}
                        onPress={() => setMenuOpen(false)}
                    >
                        <Text style={styles.modalCloseText}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
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
    flex: { flex: 1 },
    topHeader: {
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 10,
    },
    topHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    topHeaderTitle: { fontSize: 16, fontWeight: "600" },
    topHeaderAction: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    container: { padding: 16 },
    statusText: { fontSize: 12, fontWeight: "600" },
    statusSubtext: { fontSize: 11, marginTop: 2 },
    field: { marginBottom: 18 },
    fieldLabel: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    questionInput: {
        minHeight: 46,
        textAlignVertical: "top",
    },
    scriptureRef: {
        paddingVertical: 0,
        paddingHorizontal: 8,
        marginRight: 6,
        minHeight: 44,
        textAlignVertical: "center",
    },
    scriptureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 0,
        minHeight: 46,
        flex: 1,
    },
    scriptureInlineRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    scriptureActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    brpInline: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        gap: 6,
        height: 46,
        backgroundColor: ACCENT_COLOR,
        borderColor: ACCENT_COLOR,
    },
    brpInlineText: { color: "#fff", fontWeight: "600", fontSize: 12 },
    bibleButton: {
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    translationButton: {
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderRadius: 8,
    },
    translationButtonText: {
        color: ACCENT_COLOR,
        fontWeight: "700",
        fontSize: 12,
    },
    passageCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        gap: 10,
    },
    passageLine: { fontSize: 14, lineHeight: 20 },
    passageEmpty: { fontSize: 13 },
    saveButton: {
        backgroundColor: ACCENT_COLOR,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { color: "#fff", fontWeight: "600" },
    textarea: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
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
    menuList: { marginBottom: 12 },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
    },
    menuItemDivider: { borderBottomWidth: 1 },
    menuText: { fontSize: 14, fontWeight: "600" },
    menuStatus: { flex: 1 },
    menuSubtext: { fontSize: 12, marginTop: 2 },
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
