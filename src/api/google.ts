import { Alert } from "react-native";
import { auth } from "../firebase/config";
import {
    GoogleAuthProvider,
    fetchSignInMethodsForEmail,
    linkWithCredential,
    signInWithCredential,
    type User,
} from "firebase/auth";
import { router } from "expo-router";
import { useAuthStore } from "../store/authStore";

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { apiPost } from "./client";
import {
    deleteSecureItem,
    getSecureItem,
    setSecureItem,
} from "../storage/secureStorage";

const PENDING_GOOGLE_TOKEN_KEY = "pendingGoogleIdToken";
const PENDING_GOOGLE_EMAIL_KEY = "pendingGoogleEmail";

const storePendingCredential = async (idToken: string, email?: string | null) => {
    await setSecureItem(PENDING_GOOGLE_TOKEN_KEY, idToken);
    if (email) {
        await setSecureItem(PENDING_GOOGLE_EMAIL_KEY, email);
    }
};

const clearPendingCredential = async () => {
    await deleteSecureItem(PENDING_GOOGLE_TOKEN_KEY);
    await deleteSecureItem(PENDING_GOOGLE_EMAIL_KEY);
};

export async function linkPendingGoogleCredential(user: User) {
    const pendingToken = await getSecureItem(PENDING_GOOGLE_TOKEN_KEY);
    if (!pendingToken) return false;
    const pendingEmail = await getSecureItem(PENDING_GOOGLE_EMAIL_KEY);
    if (pendingEmail && user.email && pendingEmail.toLowerCase() !== user.email.toLowerCase()) {
        await clearPendingCredential();
        return false;
    }
    try {
        const credential = GoogleAuthProvider.credential(pendingToken);
        await linkWithCredential(user, credential);
        await clearPendingCredential();
        return true;
    } catch {
        await clearPendingCredential();
        return false;
    }
}

GoogleSignin.configure({
    webClientId: '791677061836-6sah8mfft46gbqjqjm3c4llmpf4iprqr.apps.googleusercontent.com',
});

export async function signInWithGoogle() {
    const setAuthLoading = useAuthStore.getState().setAuthLoading;
    let googleIdToken: string | null = null;
    let googleEmail: string | null = null;
    try {
        setAuthLoading(true, "Signing in...");
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        try {
            if (typeof (GoogleSignin as any).revokeAccess === "function") {
                await GoogleSignin.revokeAccess();
            }
        } catch {
            // ignore revoke failures
        }
        try {
            await GoogleSignin.signOut();
        } catch {
            // ignore signout failures
        }
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type !== "success") return;

        googleIdToken = signInResult.data.idToken;
        if (!googleIdToken) {
            throw new Error("Missing Google ID token");
        }
        googleEmail = signInResult.data?.user?.email ?? null;
        if (googleEmail) {
            const methods = await fetchSignInMethodsForEmail(auth, googleEmail);
            const hasPassword = methods.includes("password");
            const hasGoogle = methods.includes("google.com");
            if (hasPassword && !hasGoogle) {
                await storePendingCredential(googleIdToken, googleEmail);
                Alert.alert(
                    "Account exists",
                    "This email is registered with a password. Please sign in with email to link Google."
                );
                return;
            }
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
        await setSecureItem("backendToken", data.token);
        console.log("FIREBASE ID TOKEN:", idToken);
        console.log("BACKEND RESPONSE TOKEN:", data.token);


        router.replace("/(tabs)"); //lofin successful, redirects the user to the        proper section
    
    }catch (error: any) {
        if (error?.code === "SIGN_IN_CANCELLED") return;
        if (error?.code === "auth/account-exists-with-different-credential") {
            if (googleIdToken) {
                await storePendingCredential(googleIdToken, googleEmail);
            }
            Alert.alert(
                "Account exists",
                "This email is registered with a password. Please sign in with email to link Google."
            );
            return;
        }
        Alert.alert("Login failed", error.message ?? "Unknown error");
    } finally {
        setAuthLoading(false);
    }


}
