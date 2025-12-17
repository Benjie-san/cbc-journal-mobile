import { useEffect, useState } from "react";
import { SplashScreen, Stack, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/firebase/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncBackendSession } from "@/src/auth/syncBackend";
import { useJournalStore } from "@/src/store/journalStore";
import { useAuthStore } from "@/src/store/authStore";
import { restoreBackendSession } from "@/src/auth/restoreBackendSession";
import {Text, View} from "react-native";

export default function RootLayout() {
  const {
    firebaseReady,
    backendReady,
    user,
    setFirebaseReady,
    setBackendReady,
    setUser,
    reset,
  } = useAuthStore();

  useEffect(() => {
    // 1. Wait for Firebase to initialize
    const unsub = onAuthStateChanged(auth,async (firebaseUser) => {
      setFirebaseReady(false);
      setBackendReady(false);
    
      if (!firebaseUser) {
  
        console.log("FIREBASE AUTH STATE: LOGGED OUT");
        reset();
        useJournalStore.getState().reset();

        await AsyncStorage.multiRemove([
          "backendToken",
          "offlineQueue",
        ]);
    
        setFirebaseReady(true);
        return;
      }

      console.log("FIREBASE AUTH STATE: LOGGED IN", firebaseUser.uid);

      setUser(firebaseUser);

      // 🔐 Sync backend JWT
      try {
          await restoreBackendSession();
          console.log("BACKEND SESSION RESTORED");
          setBackendReady(true);
      } catch (err) {
              // 🔄 Token missing or expired → resync backend
        // console.log("BACKEND SESSION MISSING — RESYNCING");
        // await syncBackendSession(firebaseUser);
        reset();
        setFirebaseReady(true);
        return;
      }
      
      setFirebaseReady(true);
    });

    return unsub;
  }, []);

  if (!firebaseReady) {
    console.log("Firebase not ready yet, showing nothing");
    return(
      <>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading...</Text>
        </View>
      </>
    );
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  if (!backendReady) {
    console.log(" Backend not ready yet, showing nothing");
    return(
      <>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading...</Text>
        </View>
      </>
    );
  }

  console.log("STATE", {
    firebaseReady,
    backendReady,
    hasUser: !!user,
  });


  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );  
}
