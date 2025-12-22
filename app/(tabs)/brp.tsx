import { useCallback, useMemo, useState } from "react";
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

const YEAR = 2025;
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

export default function BRP() {
  const router = useRouter();
  const backendReady = useAuthStore((state) => state.backendReady);
  const { journals, loadJournals } = useJournalStore();
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
            apiGet(`/reading-plan/${YEAR}/${encodeURIComponent(month)}`)
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
    [backendReady, loadJournals]
  );

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
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

  const openEditor = (verse: string) => {
    router.push({
      pathname: "/journal/create",
      params: { scriptureRef: verse },
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <ScrollView
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
              <View key={month} style={styles.section}>
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
