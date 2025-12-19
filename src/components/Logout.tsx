import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Text, View } from "react-native"
import { router } from "expo-router";
import {auth} from '../firebase/config';

export default function LogoutComponent(){
    
    const logout = async () => {
        await auth.signOut();
        await AsyncStorage.removeItem("authToken");
        router.replace("/(auth)");
    }
    return(
        <View>
            <Button title="Logout" onPress={logout} />
        </View>
    );
}