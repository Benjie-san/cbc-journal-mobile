import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useJournalStore } from "../../src/store/journalStore";
import { useRouter } from "expo-router";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { apiGet } from "../../src/api/client";
import { usePlanStore } from "../../src/store/planStore";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPlanDaysByYear, savePlanDays } from "../../src/db/localDb";
import { ACCENT_COLOR } from "../../src/theme";
import { useStreakStore } from "../../src/store/streakStore";

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
  const { colors, dark: isDark } = useTheme();
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
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const currentYear = new Date().getFullYear();
  const defaultYear = PLAN_YEARS.includes(currentYear)
    ? currentYear
    : PLAN_YEARS[PLAN_YEARS.length - 1];
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
  const subtleText = isDark ? "#b9c0cf" : "#555";
  const mutedText = isDark ? "#8e95a6" : "#777";
  const chipBackground = isDark ? "#232936" : "#fff";

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

  const getStatusMeta = (entry: typeof journals[number]) => {
    const danger = isDark ? "#f97066" : "#a34242";
    const conflict = isDark ? "#f97066" : "#d64545";
    switch (entry.syncStatus) {
      case "pending_create":
      case "pending_update":
        return { icon: "server-outline", color: subtleText, text: "" };
      case "pending_delete":
        return { icon: "trash-outline", color: danger, text: "Pending delete" };
      case "pending_restore":
        return { icon: "refresh-outline", color: mutedText, text: "Pending restore" };
      case "pending_permanent_delete":
        return {
          icon: "trash-bin-outline",
          color: danger,
          text: "Pending removal",
        };
      case "conflict":
        return { icon: "alert-circle-outline", color: conflict, text: "Conflict" };
      default:
        return { icon: "cloud-done-outline", color: ACCENT_COLOR, text: "" };
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

  const statusBackground =
    statusKind === "error"
      ? isDark
        ? "#3a1f1f"
        : "#fdecea"
      : statusKind === "offline"
      ? isDark
        ? "#1c1f27"
        : "#f2f2f2"
      : isDark
      ? "#1c2333"
      : "#eef2ff";

  const statusTextColor =
    statusKind === "error" ? (isDark ? "#f97066" : "#b42318") : colors.text;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={journals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={syncing}
        onRefresh={syncJournals}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: mutedText }]}>
            No journal entries yet.
          </Text>
        }
        ListHeaderComponent={
          <View style={[styles.header,]}>
            
            <View style={[styles.todayCard, { backgroundColor: colors.card, gap: 10 }]}>
              
              <View style={{ marginTop: 1 }} />
              <View style={styles.todayRow}>

                <View style={styles.todayInfo}>
                  <Text style={[styles.todayTitle, { color: colors.text }]}>
                    Today's Passage
                  </Text>
                  {todayLoading ? (
                    <Text style={[styles.todaySubtle, { color: mutedText }]}>
                      Loading passage...
                    </Text>
                  ) : todayError ? (
                    <Text style={styles.todayError}>{todayError}</Text>
                  ) : todayPassage ? (
                    <>
                      <Text style={[styles.todayVerse, { color: colors.text }]}>
                        {todayPassage.verse}
                      </Text>
                      <Text style={[styles.todayDate, { color: mutedText }]}>
                        {todayPassage.month} {todayPassage.date}, {todayPassage.year}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.todaySubtle, { color: mutedText }]}>
                      No passage available.
                    </Text>
                  )}
                </View>
                  <View >
                    <View style={[styles.streakRow]}>
                      <View style={[styles.streakPill, { backgroundColor: colors.card }]}>
            
                        <Text style={[styles.streakValue, { color: colors.text }]}>
                          {currentStreak}
                        </Text>
                        <Ionicons name="flame-outline" size={18} color={ACCENT_COLOR} />
                      </View>
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
              <View style={{ marginTop: 1 }} />
            </View>
            {statusText ? (
              <Animated.View
                style={[
                  styles.statusBanner,
                  { backgroundColor: statusBackground },
                  {
                    transform: [{ translateY: statusTranslate }],
                    opacity: statusOpacity,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBannerText,
                    { color: statusTextColor },
                  ]}
                >
                  {statusText}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.card, margin: 10 }]}
            onPress={() => handleOpen(item._id)}
            onLongPress={() => confirmSoftDelete(item._id)}
          >
            <View style={[styles.statusChipFloating, { backgroundColor: chipBackground }]}>
              {(() => {
                const meta = getStatusMeta(item);
                return (
                  <>
                    <Ionicons
                      name={meta.icon as any}
                      size={14}
                      color={meta.color}
                    />
                    {meta.text ? (
                      <Text style={[styles.syncStatus, { color: meta.color }]}>
                        {meta.text}
                      </Text>
                    ) : null}
                  </>
                );
              })()}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {item.title || "Untitled Entry"}
            </Text>
            {item.scriptureRef ? (
              <Text style={[styles.scriptureRef, { color: subtleText }]}>
                {item.scriptureRef}
              </Text>
            ) : null}
            {item.tags?.length ? (
              <Text style={styles.tagsLine}>{item.tags.join(", ")}</Text>
            ) : null}
            {item.lastSavedAt ? (
              <Text style={[styles.lastSavedAt, { color: mutedText }]}>
                {formatTime(item.lastSavedAt)}
              </Text>
            ) : null}
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
  streakRow: {
    alignItems: "flex-end",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakValue: { fontSize: 16, fontWeight: "700" },
  todayCard: {
    padding: 14,
    gap: 8,
  },
  todayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  todayInfo: { flex: 1 },
  todayTitle: { fontSize: 16, fontWeight: "600" },
  todayVerse: { fontSize: 14, marginTop: 4 },
  todayDate: { fontSize: 12, marginTop: 2 },
  todaySubtle: { fontSize: 13, marginTop: 4 },
  todayError: { fontSize: 13, color: "#d64545", marginTop: 4 },
  todayButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: ACCENT_COLOR,
  },
  todayButtonDisabled: { backgroundColor: "#9db5ee" },
  todayButtonText: { color: "#fff", fontWeight: "600" },
  statusBanner: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    position: "relative",
  },
  title: { fontSize: 16, fontWeight: "600" },
  scriptureRef: { marginTop: 6 },
  tagsLine: { marginTop: 4, color: ACCENT_COLOR, fontSize: 12 },
  statusChipFloating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  syncStatus: { fontSize: 12, color: "#555" },
  lastSavedAt: { fontSize: 12, marginTop: 6, alignSelf: "flex-end" },
  preview: { marginTop: 6 },
  empty: { textAlign: "center", marginTop: 40 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: { color: "white", fontSize: 28, fontWeight: "600" },
});
