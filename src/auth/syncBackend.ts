import { apiPost } from "@/src/api/client";
import { User } from "firebase/auth";
import { setSecureItem } from "../storage/secureStorage";

export async function syncBackendSession(user: User) {
    const idToken = await user.getIdToken(true);

    const res = await apiPost("/auth", { idToken });

    if (!res?.token) {
        throw new Error("Backend did not return token");
    }

    await setSecureItem("backendToken", res.token);
}
