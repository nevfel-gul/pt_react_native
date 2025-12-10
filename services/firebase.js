import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDSF66kXcMgI3CVCh1i8hUozonHRjgdPSM",
    authDomain: "pt-app-native.firebaseapp.com",
    projectId: "pt-app-native",
    storageBucket: "pt-app-native.firebasestorage.app",
    messagingSenderId: "1025055592924",
    appId: "1:1025055592924:web:39e34ec8d97d95685cbf19",
    measurementId: "G-PM6R13W2CQ"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
