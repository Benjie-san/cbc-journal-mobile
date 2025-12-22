import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { apiGet } from "../../src/api/client";
import { useAuthStore } from "../../src/store/authStore";
import { useJournalStore } from "../../src/store/journalStore";
import { usePlanStore } from "../../src/store/planStore";

type PlanDay = {
  _id: string;
  year: number;
  month: string;
  date: number;
  order: number;
  verse: string;
  isSermonNotes: boolean;
  completed?: boolean;
  completedAt?: string | null;
  journalEntryId?: string | null;
};

const YEAR_OPTIONS = [2024, 2025];
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
const AUTO_SCROLL_MONTH = MONTHS[new Date().getMonth()];
const SCROLL_OFFSET = 12;

export default function BRP() {
  const router = useRouter();
  const backendReady = useAuthStore((state) => state.backendReady);
  const { journals, loadJournals } = useJournalStore();
  const selectedYear = usePlanStore((state) => state.selectedYear);
  const setSelectedYear = usePlanStore((state) => state.setSelectedYear);
  const hydratePlanYear = usePlanStore((state) => state.hydrate);
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const pendingScrollMonth = useRef<string | null>(null);
  const autoExpandRef = useRef(false);
  const currentYear = new Date().getFullYear();
  const defaultYear = YEAR_OPTIONS.includes(currentYear)
    ? currentYear
    : YEAR_OPTIONS[YEAR_OPTIONS.length - 1];
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [planByMonth, setPlanByMonth] = useState<Record<string, PlanDay[]>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    () => {
      const currentMonth = MONTHS[new Date().getMonth()];
      return { [currentMonth]: true };
    }
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(
    async (isRefresh = false) => {
      if (!backendReady) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const responses = await Promise.all(
          MONTHS.map((month) =>
            apiGet(`/reading-plan/${selectedYear}/${encodeURIComponent(month)}`)
          )
        );
        const next: Record<string, PlanDay[]> = {};
        MONTHS.forEach((month, index) => {
          next[month] = responses[index] ?? [];
        });
        setPlanByMonth(next);
        await loadJournals();
      } catch (err: any) {
        setError(err?.message ?? "Failed to load reading plan");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [backendReady, loadJournals, selectedYear]
  );

  useFocusEffect(
    useCallback(() => {
      hydratePlanYear(defaultYear, YEAR_OPTIONS);
      loadPlan();
    }, [defaultYear, hydratePlanYear, loadPlan])
  );

  const completionRefs = useMemo(() => {
    const map = new Set<string>();
    journals.forEach((entry) => {
      const ref = (entry.scriptureRef ?? "").trim().toLowerCase();
      if (!ref) return;
      const title = (entry.title ?? "").trim();
      const observation = (entry.content?.observation ?? "").trim();
      const application = (entry.content?.application ?? "").trim();
      if (title && observation && application) {
        map.add(ref);
      }
    });
    return map;
  }, [journals]);

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

  const openEditor = (verse: string) => {
    const existing = findLatestEntry(verse);
    if (existing?._id) {
      router.push({
        pathname: "/journal/edit",
        params: { id: existing._id },
      });
      return;
    }
    router.push({
      pathname: "/journal/create",
      params: { scriptureRef: verse },
    });
  };

  const scrollToMonth = useCallback((month: string, animated = true) => {
    const offset = sectionOffsets.current[month];
    if (offset === undefined) {
      pendingScrollMonth.current = month;
      return;
    }
    pendingScrollMonth.current = null;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(offset - SCROLL_OFFSET, 0),
        animated,
      });
    });
  }, []);

  const selectYear = (year: number) => {
    setSelectedYear(year);
    setYearMenuOpen(false);
    autoExpandRef.current = false;
    pendingScrollMonth.current = null;
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = !prev[month];
      if (next) {
        scrollToMonth(month);
      }
      return {
        ...prev,
        [month]: next,
      };
    });
  };

  useEffect(() => {
    if (!backendReady) return;
    if (autoExpandRef.current) return;
    if (!planByMonth[AUTO_SCROLL_MONTH]) return;
    autoExpandRef.current = true;
    setExpandedMonths((prev) => ({
      ...prev,
      [AUTO_SCROLL_MONTH]: false,
    }));
    requestAnimationFrame(() => {
      setExpandedMonths((prev) => ({
        ...prev,
        [AUTO_SCROLL_MONTH]: true,
      }));
      scrollToMonth(AUTO_SCROLL_MONTH, true);
    });
  }, [backendReady, planByMonth, selectedYear, scrollToMonth]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bible Reading Plan</Text>
        <Pressable
          style={styles.yearButton}
          onPress={() => setYearMenuOpen((prev) => !prev)}
        >
          <Text style={styles.yearText}>{selectedYear}</Text>
          {/* <Ionicons name="chevron-down" size={16} color="#333" /> */}
        </Pressable>
      </View>

      {yearMenuOpen ? (
        <View style={styles.yearMenu}>
          {YEAR_OPTIONS.map((year) => (
            <Pressable
              key={year}
              style={[
                styles.yearOption,
                year === selectedYear && styles.yearOptionActive,
              ]}
              onPress={() => selectYear(year)}
            >
              <Text
                style={[
                  styles.yearOptionText,
                  year === selectedYear && styles.yearOptionTextActive,
                ]}
              >
                {year}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPlan(true)}
            />
          }
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {MONTHS.map((month) => {
            const days = planByMonth[month] ?? [];
            const expanded = !!expandedMonths[month];

            return (
              <View
                key={month}
                style={styles.section}
                onLayout={(event) => {
                  sectionOffsets.current[month] = event.nativeEvent.layout.y;
                  if (pendingScrollMonth.current === month) {
                    scrollToMonth(month, false);
                  }
                }}
              >
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => toggleMonth(month)}
                >
                  <Text style={styles.sectionTitle}>{month}</Text>
                  <View style={styles.sectionRight}>
                    <Text style={styles.sectionCount}>
                      {days.length}
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#444"
                    />
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.sectionBody}>
                    {days.length ? (
                      days.map((day) => {
                        const refKey = day.verse.trim().toLowerCase();
                        const isCompleted = completionRefs.has(refKey);

                        return (
                          <Pressable
                            key={day._id}
                            style={styles.row}
                            onPress={() => openEditor(day.verse)}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={styles.date}>{day.date}</Text>
                              <Text style={styles.verse}>{day.verse}</Text>
                            </View>
                            <Ionicons
                              name={
                                isCompleted
                                  ? "checkmark-circle"
                                  : "ellipse-outline"
                              }
                              size={18}
                              color={isCompleted ? "#2f9a4c" : "#999"}
                            />
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={styles.empty}>No entries.</Text>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111" },
  yearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  yearText: { fontSize: 14, fontWeight: "600", color: "#333" },
  yearMenu: {
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    paddingVertical: 6,
    marginBottom: 12,
  },
  yearOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yearOptionActive: {
    backgroundColor: "#e3e3e3",
  },
  yearOptionText: { fontSize: 14, color: "#333" },
  yearOptionTextActive: { fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: {
    color: "#d64545",
    marginBottom: 12,
    textAlign: "center",
  },
  section: {
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionCount: { color: "#666", fontSize: 12 },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  date: { width: 26, color: "#666" },
  verse: { flexShrink: 1, color: "#222" },
  empty: { color: "#888", paddingVertical: 10 },
});
