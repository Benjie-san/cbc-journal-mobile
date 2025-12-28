import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useJournalStore } from "../../src/store/journalStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { ACCENT_COLOR } from "../../src/theme";

export default function SearchScreen() {
  const router = useRouter();
  const { colors, dark: isDark } = useTheme();
  const { journals, loadJournals } = useJournalStore();
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const subtleText = isDark ? "#b9c0cf" : "#555";
  const mutedText = isDark ? "#8e95a6" : "#777";
  const chipBackground = isDark ? "#1f2430" : "#f2f2f2";
  const inputBackground = isDark ? "#1a1f2b" : "#fff";
  const inputBorder = isDark ? "#2f3645" : "#ccc";
  const listBackground = isDark ? colors.background : "#f2f2f2";
  const cardBackground = isDark ? colors.card : "#fff";

  useFocusEffect(
    useCallback(() => {
      loadJournals();
    }, [loadJournals])
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
      const terms = q.split(/\s+/).filter(Boolean);
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
        return terms.every((term) => parts.includes(term));
      });
    }
    if (selectedTags.length) {
      const selected = selectedTags.map((tag) => tag.toLowerCase());
      data = data.filter((entry) => {
        const entryTags = (entry.tags ?? []).map((tag) => tag.toLowerCase());
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

  const formatTime = (value?: string) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: listBackground }]}
    >
      <FlatList
        data={filteredJournals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: mutedText }]}>
            {journals.length ? "No matching entries." : "No journal entries yet."}
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
            <TextInput
              style={[
                styles.search,
                {
                  backgroundColor: inputBackground,
                  borderColor: inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Search entries"
              placeholderTextColor={mutedText}
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
                    { backgroundColor: chipBackground },
                    selectedTags.length === 0 && styles.tagChipActive,
                  ]}
                  onPress={clearTags}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: isDark ? "#e0e6f5" : "#333" },
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
                        { backgroundColor: chipBackground },
                        active && styles.tagChipActive,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: isDark ? "#e0e6f5" : "#333" },
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
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: cardBackground }]}
            onPress={() => handleOpen(item._id)}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {item.title || "Untitled Entry"}
            </Text>
            {item.scriptureRef ? (
              <Text style={[styles.scriptureRef, { color: subtleText }]}>
                {item.scriptureRef}
              </Text>
            ) : null}
            {item.tags?.length ? (
              <View style={styles.resultTags}>
                {item.tags.map((tag) => (
                  <Pressable
                    key={`${item._id}-${tag}`}
                    style={[styles.resultTag, { backgroundColor: chipBackground }]}
                    onPress={() => handleOpen(item._id)}
                  >
                    <Text
                      style={[
                        styles.resultTagText,
                        { color: isDark ? "#e0e6f5" : "#333" },
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {item.lastSavedAt ? (
              <Text style={[styles.lastSavedAt, { color: mutedText }]}>
                {formatTime(item.lastSavedAt)}
              </Text>
            ) : null}
            <Text style={[styles.preview, { color: subtleText }]}>
              {item.content?.observation?.slice(0, 80) || ""}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 12, gap: 10 },
  title: { fontSize: 18, fontWeight: "600" },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tagList: { gap: 8, marginTop: 10, paddingBottom: 4 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagChipActive: { backgroundColor: ACCENT_COLOR },
  tagText: { fontSize: 12, fontWeight: "600" },
  tagTextActive: { color: "#fff" },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  scriptureRef: { marginTop: 6 },
  resultTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  resultTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  resultTagText: { fontSize: 11, fontWeight: "600" },
  lastSavedAt: { fontSize: 12, marginTop: 6, alignSelf: "flex-end" },
  preview: { marginTop: 6 },
  empty: { textAlign: "center", marginTop: 40 },
});
