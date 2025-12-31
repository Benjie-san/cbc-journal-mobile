import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useTheme } from "@react-navigation/native";

export default function LegalScreen() {
  const { colors } = useTheme();
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const resolvedUrl = Array.isArray(url) ? url[0] : url;
  const resolvedTitle = Array.isArray(title) ? title[0] : title;

  const safeUrl = useMemo(() => {
    if (!resolvedUrl) return null;
    return resolvedUrl.startsWith("https://") ? resolvedUrl : null;
  }, [resolvedUrl]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: resolvedTitle ?? "Legal", headerShown: true }} />
      {safeUrl ? (
        <WebView
          originWhitelist={["https://*"]}
          source={{ uri: safeUrl }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.text} />
            </View>
          )}
        />
      ) : (
        <View style={styles.loader}>
          <Text style={{ color: colors.text }}>Missing or invalid URL.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = {
  loader: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
