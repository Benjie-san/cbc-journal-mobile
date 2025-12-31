import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../src/firebase/config";
import { apiGet, apiPost } from "../src/api/client";
import { useJournalStore } from "../src/store/journalStore";
import { useAuthStore } from "../src/store/authStore";
import { ThemeProvider } from "@react-navigation/native";
import { darkTheme, lightTheme } from "../src/theme";
import { useThemeStore } from "../src/store/themeStore";
import { useStreakStore } from "../src/store/streakStore";
import {
  getCrashlytics,
  log as logCrash,
  setUserId,
  setCrashlyticsCollectionEnabled,
} from "@react-native-firebase/crashlytics";
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "../src/storage/secureStorage";
import { logDebug } from "../src/utils/logger";

export default function RootLayout() {
  const resetStore = useJournalStore((state) => state.reset);
  const setFirebaseReadyStore = useAuthStore((state) => state.setFirebaseReady);
  const setBackendReady = useAuthStore((state) => state.setBackendReady);
  const setUser = useAuthStore((state) => state.setUser);
  const resetAuth = useAuthStore((state) => state.reset);
  const theme = useThemeStore((state) => state.theme);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrateStreak = useStreakStore((state) => state.hydrate);
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";
  const isLegal = segments[0] === "legal";
  const isVerifyScreen = inAuthGroup && segments[1] === "verify-email";
  const isRoot = segments.length === 0 || segments[0] === "index";
  const OFFLINE_TIMEOUT_MS = 6000;

  useEffect(() => {
    const crash = getCrashlytics();
    setCrashlyticsCollectionEnabled(crash, !__DEV__);
  }, []);

  useEffect(() => {
    hydrateTheme();
    hydrateStreak();
  }, [hydrateTheme, hydrateStreak]);

  useEffect(() => {
    const exchangeBackendToken = async (firebaseUser: User) => {
      logCrash(getCrashlytics(), "Auth: exchange backend token");
      const idToken = await firebaseUser.getIdToken(true);
      const data = await apiPost(
        "/auth",
        { idToken },
        false,
        OFFLINE_TIMEOUT_MS
      );
      const token = data?.token;
      if (!token) return null;
      await setSecureItem("backendToken", token);
      return token;
    };

    // 1. Wait for Firebase to initialize
    const unsub = onAuthStateChanged(auth, async (user) => {
      logDebug("FIREBASE AUTH STATE:", user ? "LOGGED IN" : "LOGGED OUT");
      setFirebaseReadyStore(true);
      setUser(user);
      if (user?.uid) {
        setUserId(getCrashlytics(), user.uid);
        logCrash(getCrashlytics(), "Auth: user signed in");
      } else {
        logCrash(getCrashlytics(), "Auth: user signed out");
      }

      if (!user) {
        resetStore();
        resetAuth();
        await deleteSecureItem("backendToken");
        if (!inAuthGroup && !isLegal) {
          router.replace("/(auth)");
        }
        return;
      }

      const isPasswordUser = user.providerData.some(
        (provider) => provider.providerId === "password"
      );
      if (isPasswordUser && !user.emailVerified) {
        setBackendReady(false);
        logCrash(getCrashlytics(), "Auth: email not verified");
        if (!isVerifyScreen) {
          router.replace("/(auth)/verify-email");
        }
        return;
      }

      try {
        await useJournalStore.getState().loadJournals();
      } catch (err) {
        logDebug("Failed to load journals on login:", err);
      }

      // 2. Check backend token
      let token = await getSecureItem("backendToken");
      logDebug("LOADED backendToken:", token ? "present" : "missing");

      if (!token) {
        logDebug("No backend token -> exchanging with /auth");
        try {
          token = await exchangeBackendToken(user);
        } catch (err) {
          logDebug("Backend token exchange failed:", err);
          logCrash(getCrashlytics(), "Auth: backend token exchange failed");
        }
        if (!token) {
          resetStore();
          resetAuth();
          router.replace("/(auth)");
          return;
        }
      }

      // 3. Validate backend session with /me
      try {
        const me = await apiGet("/me", true, OFFLINE_TIMEOUT_MS);
        logDebug("SESSION RESTORED, ME:", me);
        logCrash(getCrashlytics(), "Auth: session restored");

        await useStreakStore.getState().bootstrapFromServer(me);
        setBackendReady(true);
        try {
          await useJournalStore.getState().syncJournals();
        } catch (syncErr) {
          logDebug("Initial sync failed:", syncErr);
          logCrash(getCrashlytics(), "Sync: initial sync failed");
        }
        if (inAuthGroup || isRoot) {
          router.replace("/(tabs)");
        }
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 401 || status === 403) {
          logDebug("Backend session invalid -> retry /auth");
          logCrash(getCrashlytics(), "Auth: backend session invalid");
          try {
            await exchangeBackendToken(user);
            const me = await apiGet("/me", true, OFFLINE_TIMEOUT_MS);
            await useStreakStore.getState().bootstrapFromServer(me);
            setBackendReady(true);
            try {
              await useJournalStore.getState().syncJournals();
            } catch (syncErr) {
              logDebug("Initial sync failed:", syncErr);
              logCrash(getCrashlytics(), "Sync: initial sync failed");
            }
            if (inAuthGroup || isRoot) {
              router.replace("/(tabs)");
            }
          } catch (retryErr) {
            logDebug("Backend session restore failed:", retryErr);
            logCrash(getCrashlytics(), "Auth: backend restore failed");
            resetStore();
            resetAuth();
            await deleteSecureItem("backendToken");
            if (!inAuthGroup) {
              router.replace("/(auth)");
            }
          }
        } else {
          logDebug("Backend unreachable, entering offline mode");
          logCrash(getCrashlytics(), "Network: backend unreachable");
          setBackendReady(false);
          if (inAuthGroup || isRoot) {
            router.replace("/(tabs)");
          }
        }
      }
    });

    return unsub;
  }, [inAuthGroup, isRoot]);

  const navTheme = theme === "dark" ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="index"
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
