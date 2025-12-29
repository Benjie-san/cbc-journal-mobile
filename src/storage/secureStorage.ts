import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export async function getSecureItem(key: string) {
  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue) return secureValue;

  const legacyValue = await AsyncStorage.getItem(key);
  if (legacyValue) {
    await SecureStore.setItemAsync(key, legacyValue);
    await AsyncStorage.removeItem(key);
    return legacyValue;
  }

  return null;
}

export async function setSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
  await AsyncStorage.removeItem(key);
}

export async function deleteSecureItem(key: string) {
  await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
}
