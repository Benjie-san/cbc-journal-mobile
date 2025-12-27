import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Menu" }} />
      <Stack.Screen name="trash" options={{ title: "Trash" }} />
      <Stack.Screen name="tutorial" options={{ title: "Tutorial" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}
