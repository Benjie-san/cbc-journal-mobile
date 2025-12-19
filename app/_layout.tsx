import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
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

  useEffect(() => {
    const exchangeBackendToken = async (firebaseUser: User) => {
      const idToken = await firebaseUser.getIdToken(true);
      const data = await apiPost("/auth", { idToken }, false);
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
        router.replace("/(auth)");
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
        const me = await apiGet("/me");
        console.log("SESSION RESTORED, ME:", me);

        setBackendReady(true);
        router.replace("/(tabs)");
      } catch (err) {
        console.log("Backend session invalid -> retry /auth");
        try {
          await exchangeBackendToken(user);
          await apiGet("/me");
          setBackendReady(true);
          router.replace("/(tabs)");
        } catch (retryErr) {
          console.log("Backend session restore failed:", retryErr);
          resetStore();
          resetAuth();
          await AsyncStorage.removeItem("backendToken");
          router.replace("/(auth)");
        }
      }
    });

    return unsub;
  }, []);

  if (!firebaseReady) {
    console.log("Waiting for Firebase to initialize...");
    return null; // or splash screen
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="index"
    />
  );
}
