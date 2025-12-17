import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Text, View } from "react-native"
import { router } from "expo-router";
import { auth } from '../../src/firebase/config';
import { useJournalStore } from "@/src/store/journalStore";
import { useAuthStore } from "@/src/store/authStore";

export default function Settings() {

    const logout = async () => {
        await auth.signOut();
    
    }

    return(<>
        <Button title="Logout" onPress={logout} />
        
    </>);
}