import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useJournalStore } from "../../src/store/journalStore";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiGet } from "../../src/api/client";
import { usePlanStore } from "../../src/store/planStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPlanDaysByYear, savePlanDays } from "../../src/db/localDb";

const PLAN_YEARS = [2024, 2025];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


export default function JournalListScreen() {
  const router = useRouter();
  const {
    journals,
    loadJournals,
    softDelete,
    syncJournals,
    syncing,
    isOnline,
    lastSyncAt,
    syncError,
  } = useJournalStore();
  const selectedYear = usePlanStore((state) => state.selectedYear);
  const hydratePlanYear = usePlanStore((state) => state.hydrate);
  const currentYear = new Date().getFullYear();
  const defaultYear = PLAN_YEARS.includes(currentYear)
    ? currentYear
    : PLAN_YEARS[PLAN_YEARS.length - 1];
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [todayPassage, setTodayPassage] = useState<{
    verse: string;
    month: string;
    date: number;
    year: number;
  } | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "offline" | "error">(
    "info"
  );
  const statusTranslate = useRef(new Animated.Value(-20)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCacheRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadJournals();
    }, [loadJournals])
  );

  const loadTodayPassage = useCallback(async () => {
    setTodayLoading(true);
    setTodayError(null);

    const now = new Date();
    const month = MONTHS[now.getMonth()];
    const date = now.getDate();
    const planYear = PLAN_YEARS.includes(selectedYear)
      ? selectedYear
      : defaultYear;
    let hasCachedMatch = false;

    try {
      const cached = await getPlanDaysByYear(planYear);
      if (cached.length) {
        const cachedToday = cached.find(
          (day) => day.month === month && day.date === date
        );
        if (cachedToday?.verse) {
          setTodayPassage({
            verse: cachedToday.verse,
            month,
            date,
            year: planYear,
          });
          hasCachedMatch = true;
        }
      }

      const monthDays = await apiGet(
        `/reading-plan/${planYear}/${encodeURIComponent(month)}`
      );
      const match = monthDays.find((day: any) => day.date === date);

      if (match?.verse) {
        setTodayPassage({
          verse: match.verse,
          month,
          date,
          year: planYear,
        });
      } else {
        const januaryDays = await apiGet(`/reading-plan/${planYear}/January`);
        const firstDay = januaryDays.find((day: any) => day.date === 1);
        if (firstDay?.verse) {
          setTodayPassage({
            verse: firstDay.verse,
            month: "January",
            date: 1,
            year: planYear,
          });
        }
      }

      const planRows = monthDays.map((day: any) => ({
        year: planYear,
        month,
        date: day.date,
        order: day.order,
        verse: day.verse,
        isSermonNotes: !!day.isSermonNotes,
      }));
      await savePlanDays(planRows);
    } catch (err: any) {
      if (!hasCachedMatch) {
        setTodayPassage(null);
        setTodayError(err?.message ?? "Failed to load today's passage.");
      }
    } finally {
      setTodayLoading(false);
    }
  }, [defaultYear, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      hydratePlanYear(defaultYear, PLAN_YEARS);
      loadTodayPassage();
    }, [defaultYear, hydratePlanYear, loadTodayPassage])
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    journals.forEach((entry) => {
      (entry.tags ?? []).forEach((tag) => {
        const cleaned = tag.trim();
        if (cleaned) set.add(cleaned);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [journals]);

  const filteredJournals = useMemo(() => {
    let data = journals;
    const q = query.trim().toLowerCase();
    if (q) {
      data = data.filter((entry) => {
        const parts = [
          entry.title,
          entry.scriptureRef,
          entry.content?.question,
          entry.content?.observation,
          entry.content?.application,
          entry.content?.prayer,
          ...(entry.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return parts.includes(q);
      });
    }
    if (selectedTags.length) {
      const selected = selectedTags.map((tag) => tag.toLowerCase());
      data = data.filter((entry) => {
        const entryTags = (entry.tags ?? []).map((tag) =>
          tag.toLowerCase()
        );
        return selected.some((tag) => entryTags.includes(tag));
      });
    }
    return data;
  }, [journals, query, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => setSelectedTags([]);

  const findLatestEntry = useCallback(
    (verse: string) => {
      const target = verse.trim().toLowerCase();
      const matches = journals.filter(
        (entry) =>
          (entry.scriptureRef ?? "").trim().toLowerCase() === target
      );
      if (!matches.length) return null;
      return matches.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })[0];
    },
    [journals]
  );

  const handleOpen = async (id: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore haptics errors
    }
    router.push({
      pathname: "/journal/edit",
      params: { id },
    });
  };

  const todayEntry = useMemo(() => {
    if (!todayPassage?.verse) return null;
    return findLatestEntry(todayPassage.verse);
  }, [findLatestEntry, todayPassage?.verse]);

  const handleTodayOpen = () => {
    if (!todayPassage?.verse) return;
    if (todayEntry?._id) {
      router.push({
        pathname: "/journal/edit",
        params: { id: todayEntry._id },
      });
      return;
    }
    router.push({
      pathname: "/journal/create",
      params: { scriptureRef: todayPassage.verse },
    });
  };

  const formatStatus = (entry: typeof journals[number]) => {
    switch (entry.syncStatus) {
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

  const showStatus = useCallback(
    (text: string, kind: "info" | "offline" | "error") => {
      statusCacheRef.current = text;
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      statusTranslate.setValue(-20);
      statusOpacity.setValue(0);
      setStatusKind(kind);
      setStatusText(text);
      Animated.parallel([
        Animated.timing(statusTranslate, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(statusOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      statusTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(statusTranslate, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(statusOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setStatusText(null);
        });
      }, 2600);
    },
    [statusOpacity, statusTranslate]
  );

  useEffect(() => {
    let nextText: string | null = null;
    let nextKind: "info" | "offline" | "error" = "info";

    if (syncError) {
      nextText =
        syncError.toLowerCase().includes("timed out")
          ? "Request timed out"
          : syncError;
      nextKind = "error";
    } else if (!isOnline) {
      nextText = "Offline mode";
      nextKind = "offline";
    } else if (lastSyncAt) {
      nextText = `Last sync: ${formatTime(lastSyncAt)}`;
      nextKind = "info";
    }

    if (!nextText || statusCacheRef.current === nextText) return;
    showStatus(nextText, nextKind);
  }, [
    isOnline,
    lastSyncAt,
    showStatus,
    syncError,
  ]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const confirmSoftDelete = (id: string) => {
    Alert.alert(
      "Move to trash?",
      "You can restore this entry later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Move", style: "destructive", onPress: () => softDelete(id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredJournals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshing={syncing}
        onRefresh={syncJournals}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {journals.length ? "No matching entries." : "No journal entries yet."}
          </Text>
        }
        ListHeaderComponent={
          <View style={[styles.header]}>
            <View style={[styles.todayCard,  { backgroundColor: "#fff" }]}>
              <View style={styles.todayRow}>
                <View style={styles.todayInfo}>
                  <Text style={styles.todayTitle}>Today's Passage</Text>
                  {todayLoading ? (
                    <Text style={styles.todaySubtle}>Loading passage...</Text>
                  ) : todayError ? (
                    <Text style={styles.todayError}>{todayError}</Text>
                  ) : todayPassage ? (
                    <>
                      <Text style={styles.todayVerse}>{todayPassage.verse}</Text>
                      <Text style={styles.todayDate}>
                        {todayPassage.month} {todayPassage.date}, {todayPassage.year}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.todaySubtle}>No passage available.</Text>
                  )}
                </View>
                <Pressable
                  style={[
                    styles.todayButton,
                    !todayPassage && styles.todayButtonDisabled,
                  ]}
                  onPress={handleTodayOpen}
                  disabled={!todayPassage}
                >
                  {todayEntry ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : null}
                  <Text style={styles.todayButtonText}>
                    {todayEntry ? "Entry Added" : "Add Entry"}
                  </Text>
                </Pressable>
              </View>
            </View>
            {statusText ? (
              <Animated.View
                style={[
                  styles.statusBanner,
                  statusKind === "offline" && styles.statusBannerOffline,
                  statusKind === "error" && styles.statusBannerError,
                  {
                    transform: [{ translateY: statusTranslate }],
                    opacity: statusOpacity,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBannerText,
                    statusKind === "error" && styles.statusBannerTextError,
                  ]}
                >
                  {statusText}
                </Text>
              </Animated.View>
            ) : null}
            <View style={{ paddingLeft: 10, paddingRight: 10, marginTop: 5 }}>
            <TextInput
              style={[styles.search,]}
              placeholder="Search entries"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {allTags.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagList}
              >
                <Pressable
                  style={[
                    styles.tagChip,
                    selectedTags.length === 0 && styles.tagChipActive,
                  ]}
                  onPress={clearTags}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTags.length === 0 && styles.tagTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {allTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.tagChip,
                        active && styles.tagChipActive,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          active && styles.tagTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => handleOpen(item._id)}
            onLongPress={() => confirmSoftDelete(item._id)}
          >
            <Text style={styles.title}>
              {item.title || "Untitled Entry"}
            </Text>
            {item.scriptureRef ? (
              <Text style={styles.scriptureRef}>{item.scriptureRef}</Text>
            ) : null}
            {item.tags?.length ? (
              <Text style={styles.tagsLine}>{item.tags.join(", ")}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.syncStatus}>{formatStatus(item)}</Text>
              {item.lastSavedAt ? (
                <Text style={styles.lastSavedAt}>
                  {formatTime(item.lastSavedAt)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.preview}>
              {item.content?.observation?.slice(0, 80) || ""}
            </Text>
          </Pressable>
        )}
      />

      {/* Floating Create Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/journal/create")}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  header: { marginBottom: 12, gap: 10 },
  todayCard: {
    padding: 14,
    backgroundColor: "#f2f2f2",
    gap: 8,
  },
  todayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  todayInfo: { flex: 1 },
  todayTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  todayVerse: { fontSize: 14, color: "#222", marginTop: 4 },
  todayDate: { fontSize: 12, color: "#666", marginTop: 2 },
  todaySubtle: { fontSize: 13, color: "#777", marginTop: 4 },
  todayError: { fontSize: 13, color: "#d64545", marginTop: 4 },
  todayButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#2f6fed",
  },
  todayButtonDisabled: { backgroundColor: "#9db5ee" },
  todayButtonText: { color: "#fff", fontWeight: "600" },
  statusBanner: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    marginTop: 6,
  },
  statusBannerOffline: { backgroundColor: "#f2f2f2" },
  statusBannerError: { backgroundColor: "#fdecea" },
  statusBannerText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusBannerTextError: { color: "#b42318" },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  tagList: { gap: 8, marginTop: 10,paddingBottom: 4},
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f2f2f2",
  },
  tagChipActive: { backgroundColor: "#2f6fed" },
  tagText: { color: "#333", fontSize: 12, fontWeight: "600" },
  tagTextActive: { color: "#fff" },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "600" },
  scriptureRef: { marginTop: 6, color: "#555" },
  tagsLine: { marginTop: 4, color: "#2f6fed", fontSize: 12 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  syncStatus: { fontSize: 12, color: "#555" },
  lastSavedAt: { fontSize: 12, color: "#777" },
  preview: { marginTop: 6, color: "#555" },
  empty: { textAlign: "center", marginTop: 40, color: "#888" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: { color: "white", fontSize: 28, fontWeight: "600" },
});
