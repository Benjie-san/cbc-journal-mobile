import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

export default function TabsLayout() {
    const { colors } = useTheme();
    return (
        <Tabs
        screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.text,
            tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="brp"
                options={{
                    title: "BRP",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: "Search",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" size={size} color={color} />
                    ),
                }}
            />
        
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Menu",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="menu-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
