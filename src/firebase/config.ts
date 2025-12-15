
// firebase/config.js
import { initializeApp } from "firebase/app";
import {
    initializeAuth,
    getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyB_f-u95NXPbu-cn5Le8bnZtZ72M5S7sHM",
    authDomain: "cbc-journal.firebaseapp.com",
    projectId: "cbc-journal",
    storageBucket: "cbc-journal.firebasestorage.app",
    messagingSenderId: "791677061836",
    appId: "1:791677061836:web:b0f1450eb2b14d24415069",
};

export const app = initializeApp(firebaseConfig);

// The FIX ↓↓↓
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});
