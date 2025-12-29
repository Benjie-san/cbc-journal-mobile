import { Alert } from "react-native";
import { auth } from "../firebase/config";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/authStore";

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { apiPost } from "./client";


GoogleSignin.configure({
    webClientId: '791677061836-6sah8mfft46gbqjqjm3c4llmpf4iprqr.apps.googleusercontent.com',
});

export async function signInWithGoogle() {
    const setAuthLoading = useAuthStore.getState().setAuthLoading;
    try {
        setAuthLoading(true, "Signing in...");
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type !== "success") return;

        const googleIdToken = signInResult.data.idToken;
        if (!googleIdToken) {
            throw new Error("Missing Google ID token");
        }

        // Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(googleIdToken);

        
        const userCredential = await signInWithCredential(auth, googleCredential);
        const idToken = await userCredential.user.getIdToken(true);
        if (!idToken) {
            throw new Error("Missing Firebase ID token");
        }

        //Send idToken to backend
        const data = await apiPost("/auth", { idToken }, false);

        if (!data.token) {
            throw new Error("No backend token received");
        }
    
        // Save backend session token
        await AsyncStorage.setItem("backendToken", data.token);
        console.log("FIREBASE ID TOKEN:", idToken);
        console.log("BACKEND RESPONSE TOKEN:", data.token);


        router.replace("/(tabs)"); //lofin successful, redirects the user to the        proper section
    
    }catch (error: any) {
        if (error?.code === "SIGN_IN_CANCELLED") return;
        Alert.alert("Login failed", error.message ?? "Unknown error");
    } finally {
        setAuthLoading(false);
    }


}
