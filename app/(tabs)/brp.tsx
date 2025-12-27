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
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet } from "../../src/api/client";
import { useJournalStore } from "../../src/store/journalStore";
import { usePlanStore } from "../../src/store/planStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPlanDaysByYear, savePlanDays } from "../../src/db/localDb";

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
const PLAN_TIMEOUT_MS = 2500;

export default function BRP() {
  const router = useRouter();
  const { picker } = useLocalSearchParams<{ picker?: string }>();
  const isPicker = picker === "1" || picker === "true";
  const { colors, dark: isDark } = useTheme();
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
  const subtleText = isDark ? "#b9c0cf" : "#555";
  const mutedText = isDark ? "#8e95a6" : "#666";
  const chipBackground = isDark ? "#1f2430" : "#f2f2f2";
  const rowBorder = isDark ? "#2a3142" : "#e5e5e5";
  const menuActive = isDark ? "#232936" : "#e3e3e3";

  const loadPlan = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      let hasCache = false;

      try {
        const cached = await getPlanDaysByYear(selectedYear);
        hasCache = cached.length > 0;
        if (hasCache) {
          const grouped: Record<string, PlanDay[]> = {};
          MONTHS.forEach((month) => {
            grouped[month] = cached
              .filter((day) => day.month === month)
              .map((day) => ({
                _id: `${day.year}-${day.month}-${day.date}`,
                year: day.year,
                month: day.month,
                date: day.date,
                order: day.order,
                verse: day.verse,
                isSermonNotes: day.isSermonNotes,
              }));
          });
          setPlanByMonth(grouped);
        }

        const responses = await Promise.all(
          MONTHS.map((month) =>
            apiGet(
              `/reading-plan/${selectedYear}/${encodeURIComponent(month)}`,
              true,
              PLAN_TIMEOUT_MS
            )
          )
        );
        const next: Record<string, PlanDay[]> = {};
        const cacheRows: {
          year: number;
          month: string;
          date: number;
          order: number;
          verse: string;
          isSermonNotes: boolean;
        }[] = [];
        MONTHS.forEach((month, index) => {
          const data = responses[index] ?? [];
          next[month] = data;
          data.forEach((day: any) => {
            cacheRows.push({
              year: selectedYear,
              month,
              date: day.date,
              order: day.order,
              verse: day.verse,
              isSermonNotes: !!day.isSermonNotes,
            });
          });
        });
        setPlanByMonth(next);
        await savePlanDays(cacheRows);
      } catch (err: any) {
        if (!hasCache) {
          setError(err?.message ?? "Failed to load reading plan");
        }
      } finally {
        await loadJournals();
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadJournals, selectedYear]
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
      const target = {
        pathname: "/journal/edit",
        params: { id: existing._id },
      };
      if (isPicker) {
        router.replace(target);
      } else {
        router.push(target);
      }
      return;
    }
    const target = {
      pathname: "/journal/create",
      params: { scriptureRef: verse, fromBrp: "1" },
    };
    if (isPicker) {
      router.replace(target);
    } else {
      router.push(target);
    }
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
  }, [planByMonth, selectedYear, scrollToMonth]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Bible Reading Plan
        </Text>
        <Pressable
          style={[styles.yearButton, { backgroundColor: chipBackground }]}
          onPress={() => setYearMenuOpen((prev) => !prev)}
        >
          <Text style={[styles.yearText, { color: colors.text }]}>
            {selectedYear}
          </Text>
          {/* <Ionicons name="chevron-down" size={16} color="#333" /> */}
        </Pressable>
      </View>

      {yearMenuOpen ? (
        <View style={[styles.yearMenu, { backgroundColor: chipBackground }]}>
          {YEAR_OPTIONS.map((year) => (
            <Pressable
              key={year}
              style={[
                styles.yearOption,
                year === selectedYear && [styles.yearOptionActive, { backgroundColor: menuActive }],
              ]}
              onPress={() => selectYear(year)}
            >
              <Text
                style={[
                  styles.yearOptionText,
                  { color: colors.text },
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPlan(true)}
            />
          }
        >
          {error ? <Text style={[styles.error, { color: "#d64545" }]}>{error}</Text> : null}

          {MONTHS.map((month) => {
            const days = planByMonth[month] ?? [];
            const expanded = !!expandedMonths[month];

            return (
              <View
                key={month}
                style={[styles.section, { backgroundColor: colors.card }]}
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
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {month}
                  </Text>
                  <View style={styles.sectionRight}>
                    <Text style={[styles.sectionCount, { color: mutedText }]}>
                      {days.length}
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={mutedText}
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
                            style={[styles.row, { borderTopColor: rowBorder }]}
                            onPress={() => openEditor(day.verse)}
                          >
                            <View style={styles.rowLeft}>
                              <Text style={[styles.date, { color: mutedText }]}>
                                {day.date}
                              </Text>
                              <Text style={[styles.verse, { color: colors.text }]}>
                                {day.verse}
                              </Text>
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
                      <Text style={[styles.empty, { color: mutedText }]}>
                        No entries.
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  yearText: { fontSize: 14, fontWeight: "600" },
  yearMenu: {
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  yearOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yearOptionActive: {},
  yearOptionText: { fontSize: 14 },
  yearOptionTextActive: { fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: {
    color: "#d64545",
    marginBottom: 12,
    textAlign: "center",
  },
  section: {
    borderRadius: 12,
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
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionCount: { fontSize: 12 },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  date: { width: 26 },
  verse: { flexShrink: 1 },
  empty: { paddingVertical: 10 },
});
