import React from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
    children: React.ReactNode;
    scroll?: boolean;
};

export default function KeyboardLayout({ children, scroll = true }: Props) {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    {scroll ? (
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 120 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {children}
                        </ScrollView>
                    ) : (
                        children
                    )}
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
