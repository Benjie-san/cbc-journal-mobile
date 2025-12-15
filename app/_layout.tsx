import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/firebase/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet } from "../src/api/client";

export default function RootLayout() {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // 1. Wait for Firebase to initialize
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log("FIREBASE AUTH STATE:", user ? "LOGGED IN" : "LOGGED OUT");
      setFirebaseReady(true);

      if (!user) {
        router.replace("/(auth)");
        return;
      }

      // 2. Check backend token
      const token = await AsyncStorage.getItem("backendToken");
      console.log("LOADED backendToken:", token);

      if (!token) {
        console.log("No backend token → redirect to login");
        router.replace("/(auth)");
        return;
      }

      // 3. Validate backend session with /me
      try {
        const me = await apiGet("/me");
        console.log("SESSION RESTORED, ME:", me);

        router.replace("/(tabs)");
      } catch (err) {
        console.log("Backend session invalid → logout");
        await AsyncStorage.removeItem("backendToken");
        router.replace("/(auth)");
      }
    });

    return unsub;
  }, []);

  if (!firebaseReady) {
    return null; // or splash screen
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
