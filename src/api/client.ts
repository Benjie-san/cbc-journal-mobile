import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${DEFAULT_HOST}:4000`;


async function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = await AsyncStorage.getItem("backendToken");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getHeaders(withAuth: boolean) {
  if (withAuth) return getAuthHeaders();
  return { "Content-Type": "application/json" };
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildError(res: Response, data: any) {
  const message =
    typeof data === "string"
      ? data
      : data?.error || data?.message || res.statusText;
  const err = new Error(message || "Request failed") as Error & {
    status?: number;
    data?: any;
  };
  err.status = res.status;
  err.data = data;
  return err;
}

async function handleResponse(res: Response) {
  const data = await parseBody(res);
  if (!res.ok) {
    throw buildError(res, data);
  }
  return data;
}

export async function apiGet(path: string, withAuth = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: await getHeaders(withAuth),
  });

  return handleResponse(res);
}

export async function apiPost(path: string, body: any, withAuth = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await getHeaders(withAuth),
    body: JSON.stringify(body),
  });

  return handleResponse(res);
}

export async function apiPut(path: string, body: any, withAuth = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: await getHeaders(withAuth),
    body: JSON.stringify(body),
  });

  return handleResponse(res);
}

export async function apiDelete(path: string, withAuth = true) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: await getHeaders(withAuth),
  });

  return handleResponse(res);
}
