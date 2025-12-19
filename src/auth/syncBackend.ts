import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost } from "@/src/api/client";
import { User } from "firebase/auth";

export async function syncBackendSession(user: User) {
    const idToken = await user.getIdToken(true);

    const res = await apiPost("/auth", { idToken });

    if (!res?.token) {
        throw new Error("Backend did not return token");
    }

    await AsyncStorage.setItem("backendToken", res.token);
}
