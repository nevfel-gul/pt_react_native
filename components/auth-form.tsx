import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/usetheme';

export function AuthForm({ title, description, children }: React.PropsWithChildren<{ title: string; description: string }>) {
  const { theme } = useTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18 }}>
          <Text accessibilityRole="header" style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 16, lineHeight: 24 }}>{description}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function AuthInput(props: React.ComponentProps<typeof TextInput>) {
  const { theme } = useTheme();
  return <TextInput placeholderTextColor={theme.colors.text.secondary} {...props}
    style={[styles.input, { color: theme.colors.text.primary, borderColor: theme.colors.border }, props.style]} />;
}
export function AuthButton({ title, onPress, busy, disabled, secondary }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean }) {
  const { theme } = useTheme();
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress}
    style={[styles.button, { backgroundColor: secondary ? 'transparent' : theme.colors.primary, opacity: busy || disabled ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? theme.colors.primary : '#fff'} /> :
      <Text style={{ color: secondary ? theme.colors.primary : '#fff', fontWeight: '700', fontSize: 16 }}>{title}</Text>}
  </Pressable>;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 17, minHeight: 54 }, button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 } });
