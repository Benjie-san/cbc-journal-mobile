import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet } from "@/src/api/client";

/**
 * Restores backend session if token exists
 * Throws if invalid
 */
let backendToken: string | null = null;

export async function restoreBackendSession() {
    const token = await AsyncStorage.getItem("backendToken");

    if (!token) {
        throw new Error("No backend token");
    }
    backendToken = token;

    
    // Validate token with backend
    const res = await fetch("http://192.168.254.146:4000", {
        headers: {
        Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        await AsyncStorage.removeItem("backendToken");
        throw new Error("Backend session invalid");
    }

    console.log("BACKEND SESSION RESTORED");
}
