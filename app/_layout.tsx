import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export const unstable_settings = {
  anchor: '/',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // <-- burada true olmalı
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // login sayfasına yönlendirme burada, render sırasında değil!
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    // Uygulama açılırken küçük bir loading ekranı
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10 }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack >
        <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="student/[id]" options={{ title: 'Öğrenci', headerShown: false }} />
        <Stack.Screen name="newrecord/[id]" options={{ title: 'Yeni Kayıt', headerShown: false }} />
        <Stack.Screen name="record/[id]" options={{ title: 'Kayıt', headerShown: false }} />
        <Stack.Screen name="newstudent" options={{ title: 'Yeni Öğrenci', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
