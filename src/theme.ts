import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

export const ACCENT_COLOR = "#2f6fed";

export const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: ACCENT_COLOR,
    background: "#ffffff",
    card: "#ffffff",
    text: "#111111",
    border: "#e5e5e5",
    notification: ACCENT_COLOR,
  },
};

export const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: ACCENT_COLOR,
    background: "#0f1115",
    card: "#171a21",
    text: "#f1f1f1",
    border: "#2b2f3a",
    notification: ACCENT_COLOR,
  },
};
