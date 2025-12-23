import { useEffect, useState } from "react";
import { Stack, router, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { onAuthStateChanged, type User } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../src/firebase/config";
import { apiGet, apiPost } from "../src/api/client";
import { useJournalStore } from "../src/store/journalStore";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const resetStore = useJournalStore((state) => state.reset);
  const setFirebaseReadyStore = useAuthStore((state) => state.setFirebaseReady);
  const setBackendReady = useAuthStore((state) => state.setBackendReady);
  const setUser = useAuthStore((state) => state.setUser);
  const resetAuth = useAuthStore((state) => state.reset);
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";
  const isRoot = segments.length === 0 || segments[0] === "index";
  const OFFLINE_TIMEOUT_MS = 1500;

  useEffect(() => {
    const exchangeBackendToken = async (firebaseUser: User) => {
      const idToken = await firebaseUser.getIdToken(true);
      const data = await apiPost(
        "/auth",
        { idToken },
        false,
        OFFLINE_TIMEOUT_MS
      );
      const token = data?.token;
      if (!token) return null;
      await AsyncStorage.setItem("backendToken", token);
      return token;
    };

    // 1. Wait for Firebase to initialize
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log("FIREBASE AUTH STATE:", user ? "LOGGED IN" : "LOGGED OUT");
      setFirebaseReady(true);
      setFirebaseReadyStore(true);
      setUser(user);

      if (!user) {
        resetStore();
        resetAuth();
        await AsyncStorage.removeItem("backendToken");
        if (!inAuthGroup) {
          router.replace("/(auth)");
        }
        return;
      }

      // 2. Check backend token
      let token = await AsyncStorage.getItem("backendToken");
      console.log("LOADED backendToken:", token);

      if (!token) {
        console.log("No backend token -> exchanging with /auth");
        try {
          token = await exchangeBackendToken(user);
        } catch (err) {
          console.log("Backend token exchange failed:", err);
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
        console.log("SESSION RESTORED, ME:", me);

        setBackendReady(true);
        if (inAuthGroup || isRoot) {
          router.replace("/(tabs)");
        }
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 401 || status === 403) {
          console.log("Backend session invalid -> retry /auth");
          try {
            await exchangeBackendToken(user);
            await apiGet("/me", true, OFFLINE_TIMEOUT_MS);
            setBackendReady(true);
            if (inAuthGroup || isRoot) {
              router.replace("/(tabs)");
            }
          } catch (retryErr) {
            console.log("Backend session restore failed:", retryErr);
            resetStore();
            resetAuth();
            await AsyncStorage.removeItem("backendToken");
            if (!inAuthGroup) {
              router.replace("/(auth)");
            }
          }
        } else {
          console.log("Backend unreachable, entering offline mode");
          setBackendReady(false);
          if (inAuthGroup || isRoot) {
            router.replace("/(tabs)");
          }
        }
      }
    });

    return unsub;
  }, [inAuthGroup, isRoot]);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="index"
      />
    </SafeAreaProvider>
  );
}
