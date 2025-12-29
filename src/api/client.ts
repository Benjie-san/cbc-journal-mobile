import { Platform } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import Constants from "expo-constants";
import { deleteSecureItem, getSecureItem } from "../storage/secureStorage";

const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

function getHostFromExpo() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;
  if (!hostUri || typeof hostUri !== "string") return null;
  return hostUri.split(":")[0];
}

function resolveApiBase() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase;

  const envHost = process.env.EXPO_PUBLIC_API_HOST;
  const envPort = process.env.EXPO_PUBLIC_API_PORT ?? "4000";
  if (envHost) return `http://${envHost}:${envPort}`;

  const host = getHostFromExpo() ?? DEFAULT_HOST;
  return `http://${host}:4000`;
}

export const API_BASE = resolveApiBase();


async function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = await getSecureItem("backendToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getHeaders(withAuth: boolean) {
  if (withAuth) return getAuthHeaders();
  return { "Content-Type": "application/json" };
}

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_429_RETRIES = 1;

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseRetryAfter(headerValue: string | null) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(seconds * 1000, 0);
  }
  const date = Date.parse(headerValue);
  if (!Number.isNaN(date)) {
    return Math.max(date - Date.now(), 0);
  }
  return null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error("Request timed out") as Error & {
        status?: number;
      };
      timeoutErr.status = 0;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  maxRetries = MAX_429_RETRIES
) {
  let attempt = 0;
  while (true) {
    const res = await fetchWithTimeout(url, options, timeoutMs);
    if (res.status !== 429 || attempt >= maxRetries) {
      return res;
    }
    const retryAfterMs = parseRetryAfter(res.headers.get("Retry-After"));
    const backoffMs = retryAfterMs ?? Math.min(1000 * 2 ** attempt, 4000);
    attempt += 1;
    await sleep(backoffMs);
  }
}

function buildError(res: Response, data: any) {
  let message =
    typeof data === "string"
      ? data
      : data?.error || data?.message || res.statusText;
  if (res.status === 429) {
    message = "Too many requests. Please wait and try again.";
  }
  const err = new Error(message || "Request failed") as Error & {
    status?: number;
    data?: any;
    retryAfterMs?: number;
  };
  err.status = res.status;
  err.data = data;
  if (res.status === 429) {
    err.retryAfterMs = parseRetryAfter(res.headers.get("Retry-After")) ?? undefined;
  }
  return err;
}

async function handleResponse(res: Response) {
  const data = await parseBody(res);
  if (!res.ok) {
    if (res.status === 401 && data?.error === "Session revoked") {
      await handleSessionRevoked();
    }
    throw buildError(res, data);
  }
  return data;
}

let sessionRevokeInFlight = false;
async function handleSessionRevoked() {
  if (sessionRevokeInFlight) return;
  sessionRevokeInFlight = true;
  try {
    await deleteSecureItem("backendToken");
    await signOut(auth);
  } catch {
    // Ignore sign-out failures; auth state listener will handle cleanup if it succeeds.
  } finally {
    sessionRevokeInFlight = false;
  }
}

export async function apiGet(
  path: string,
  withAuth = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const res = await requestWithRetry(
    `${API_BASE}${path}`,
    {
      headers: await getHeaders(withAuth),
    },
    timeoutMs
  );

  return handleResponse(res);
}

export async function apiPost(
  path: string,
  body: any,
  withAuth = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const res = await requestWithRetry(
    `${API_BASE}${path}`,
    {
      method: "POST",
      headers: await getHeaders(withAuth),
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  return handleResponse(res);
}

export async function apiPut(
  path: string,
  body: any,
  withAuth = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const res = await requestWithRetry(
    `${API_BASE}${path}`,
    {
      method: "PUT",
      headers: await getHeaders(withAuth),
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  return handleResponse(res);
}

export async function apiDelete(
  path: string,
  withAuth = true,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const res = await requestWithRetry(
    `${API_BASE}${path}`,
    {
      method: "DELETE",
      headers: await getHeaders(withAuth),
    },
    timeoutMs
  );

  return handleResponse(res);
}
