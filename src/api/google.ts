import { Alert } from "react-native";
import { auth } from "../firebase/config";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GoogleSignin } from '@react-native-google-signin/google-signin';


GoogleSignin.configure({
    webClientId: '791677061836-6sah8mfft46gbqjqjm3c4llmpf4iprqr.apps.googleusercontent.com',
});

export async function signInWithGoogle() {
    // Somewhere in your code
    try {
        let resultToken;
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Get the users ID token
        const signInResult = await GoogleSignin.signIn();
        // sign in was cancelled by user
        
  // Try the new style of google-sign in result, from v13+ of that module
        resultToken = signInResult.data?.idToken;
    
        if (!resultToken) {
            throw new Error('No ID token found');
        }

        // Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(signInResult.data.idToken);

        
        await signInWithCredential(auth, googleCredential)
    
        const idToken = await auth.currentUser?.getIdToken(true);

        //Send idToken to backend
        const response = await fetch("http://192.168.254.146:4000/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        const data = await response.json();

        console.log("AUTH RESPONSE:", data);

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
    }


}
