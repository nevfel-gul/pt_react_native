import type { ThemeUI } from "@/constants/types";
import { ArrowLeft, Eye, Send, Sparkles, Trash2 } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type AiResultItem = {
    id: string;
    name: string;
    email?: string;
    aktif?: "Aktif" | "Pasif" | string;
};

type Props = {
    theme: ThemeUI;

    searchTerm: string;

    aiMode: boolean;
    aiReason: string;
    aiSearchLoading: boolean;

    runAiSearch: (overrideQuery?: string) => Promise<void>;
    searchActive: boolean;

    autoSendSearchTerm?: boolean;

    // ✅ KayitlarScreen’den gelen AI sonuçları (chat içinde kart olarak göstereceğiz)
    results?: AiResultItem[];

    // ✅ karta tıklayınca dışarıda navigate ettirmek için
    onOpenStudent?: (studentId: string) => void;
};

type ChatMsg = {
    id: string;
    role: "user" | "assistant" | "system";
    text: string;
};

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AiStudentSearchUI({
    theme,
    searchTerm,
    aiMode,
    aiReason,
    aiSearchLoading,
    runAiSearch,
    searchActive,
    autoSendSearchTerm = false,
    results = [],
    onOpenStudent,
}: Props) {
    const [open, setOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState("");

    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            id: "sys-1",
            role: "system",
            text: "AthleAI • Sadece mevcut öğrenci verilerine göre filtre uygular.",
        },
    ]);

    // ✅ sadece ilk açılışta göster; kullanıcı 1 kere soru sorunca gizle
    const [showQuick, setShowQuick] = useState(true);

    const listRef = useRef<FlatList<ChatMsg> | null>(null);

    const requestSeq = useRef(0);
    const pending = useRef<{ seq: number; query: string } | null>(null);

    // ✅ son tamamlanan isteğin seq'i (kartları sadece bu tamamlandıktan sonra göster)
    const [lastDoneSeq, setLastDoneSeq] = useState<number>(0);

    const hasText = !!searchTerm?.trim();

    const bubble = useMemo(() => {
        const base = {
            borderRadius: theme.radius.lg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1 as const,
            maxWidth: "88%" as const,
        };
        return {
            user: {
                ...base,
                alignSelf: "flex-end" as const,
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
            },
            assistant: {
                ...base,
                alignSelf: "flex-start" as const,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
            },
            system: {
                ...base,
                alignSelf: "center" as const,
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                maxWidth: "95%" as const,
            },
            userText: { color: theme.colors.text.primary, fontSize: 13, fontWeight: "900" as const },
            assistantText: { color: theme.colors.text.primary, fontSize: 13, fontWeight: "800" as const },
            systemText: {
                color: theme.colors.text.muted,
                fontSize: 12,
                fontWeight: "800" as const,
                textAlign: "center" as const,
            },
        };
    }, [theme]);

    const scrollToEnd = (animated = true) => {
        try {
            listRef.current?.scrollToEnd?.({ animated });
        } catch { }
    };

    const appendMsg = (role: ChatMsg["role"], text: string) => {
        const msg: ChatMsg = { id: uid(), role, text };
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => scrollToEnd(true), 50);
    };

    const resetChat = () => {
        setMessages([
            {
                id: "sys-1",
                role: "system",
                text: "AthleAI • Sadece mevcut öğrenci verilerine göre filtre uygular.",
            },
        ]);
        setAiQuery("");
        pending.current = null;
        requestSeq.current = 0;
        setLastDoneSeq(0);
        setShowQuick(true);
    };

    // search kapanınca modalı kapat
    useEffect(() => {
        if (!searchActive) {
            setOpen(false);
            setAiQuery("");
            pending.current = null;
            setLastDoneSeq(0);
        }
    }, [searchActive]);

    // modal açılınca otomatik scroll
    useEffect(() => {
        if (open) setTimeout(() => scrollToEnd(false), 50);
    }, [open]);

    // ✅ AI cevap geldiğinde chat’e bas (kartları ayrıca footer'da göstereceğiz)
    useEffect(() => {
        const p = pending.current;
        if (!p) return;
        if (aiSearchLoading) return;

        pending.current = null;
        setLastDoneSeq(p.seq);

        const base =
            aiReason && aiReason.trim().length
                ? aiReason.trim()
                : aiMode
                    ? "İşlem tamam."
                    : "İşlem yapılamadı.";

        const count = results?.length ?? 0;
        const finalText = `${base}\n\nBulunan: ${count}`;

        appendMsg("assistant", finalText);
    }, [aiSearchLoading, aiReason, aiMode, results]);

    const sendAi = async (q: string) => {
        const query = (q ?? "").trim();
        if (!query) return;

        if (showQuick) setShowQuick(false);

        appendMsg("user", query);

        requestSeq.current += 1;
        pending.current = { seq: requestSeq.current, query };

        setAiQuery("");
        await runAiSearch(query);
    };

    const openChat = async () => {
        setOpen(true);

        const hasUserMsg = messages.some((m) => m.role === "user");
        setShowQuick(!hasUserMsg);

        if (autoSendSearchTerm && hasText && !aiSearchLoading) {
            setTimeout(() => {
                sendAi(searchTerm);
            }, 150);
        }
    };

    const quickPrompts = useMemo(
        () => [
            "Aktif öğrenciler",
            "Pasif öğrenciler",
            "Bu hafta ölçüm yapanlar",
            "Son 30 günde ölçüm yapanlar",
            "Son 30 günde ölçüm yapmayanlar",
            "İsmi 'Ali' geçenler",
        ],
        []
    );

    const showResultCards = !aiSearchLoading && aiMode && lastDoneSeq > 0 && (results?.length ?? 0) > 0;

    const openStudent = (id: string) => {
        // önce modalı kapat, sonra dışarıda navigate
        setOpen(false);
        setTimeout(() => {
            onOpenStudent?.(id);
        }, 50);
    };

    const ResultCards = () => {
        const top = (results ?? []).slice(0, 20); // aşırı uzamasın
        return (
            <View style={{ paddingTop: 10 }}>
                <Text style={{ color: theme.colors.text.muted, fontWeight: "900", marginBottom: 8 }}>
                    Bulunan öğrenciler
                </Text>

                {top.map((s) => {
                    const isActive = String(s.aktif ?? "") === "Aktif";

                    return (
                        <TouchableOpacity
                            key={s.id}
                            activeOpacity={0.85}
                            onPress={() => openStudent(s.id)}
                            style={{
                                backgroundColor: theme.colors.surface,
                                borderRadius: theme.radius.lg,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                marginBottom: 10,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text
                                    style={{
                                        color: theme.colors.text.primary,
                                        fontWeight: "900",
                                        fontSize: 14,
                                    }}
                                    numberOfLines={1}
                                >
                                    {s.name}
                                </Text>

                                {!!s.email && (
                                    <Text
                                        style={{
                                            color: theme.colors.text.secondary,
                                            fontWeight: "700",
                                            fontSize: 12,
                                            marginTop: 2,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {s.email}
                                    </Text>
                                )}

                                {!!s.aktif && (
                                    <View
                                        style={{
                                            marginTop: 8,
                                            alignSelf: "flex-start",
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: theme.radius.pill,
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                            backgroundColor: isActive ? theme.colors.successSoft : theme.colors.dangerSoft,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: "900",
                                                color: isActive ? theme.colors.success : theme.colors.danger,
                                            }}
                                        >
                                            {String(s.aktif)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: theme.radius.pill,
                                    backgroundColor: theme.colors.surfaceSoft,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Eye size={18} color={theme.colors.text.primary} />
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {(results?.length ?? 0) > 20 && (
                    <Text style={{ color: theme.colors.text.muted, fontWeight: "800", marginTop: 2 }}>
                        … +{(results.length - 20)} kişi daha
                    </Text>
                )}
            </View>
        );
    };

    return (
        <>
            {/* Trigger button */}
            <TouchableOpacity
                onPress={openChat}
                disabled={aiSearchLoading}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.premium,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                    opacity: aiSearchLoading ? 0.55 : 1,
                }}
            >
                <Sparkles size={18} color="#fff" />
            </TouchableOpacity>

            {/* FULL SCREEN CHAT MODAL */}
            <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
                    >
                        {/* Header */}
                        <View
                            style={{
                                paddingTop: Platform.OS === "ios" ? 54 : 18,
                                paddingBottom: 12,
                                paddingHorizontal: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.border,
                                backgroundColor: theme.colors.background,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => setOpen(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: theme.radius.pill,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <ArrowLeft size={18} color={theme.colors.text.primary} />
                            </TouchableOpacity>

                            <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: "900" }}>AthleAI</Text>

                            <TouchableOpacity
                                onPress={resetChat}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: theme.radius.pill,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Trash2 size={18} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        <FlatList
                            ref={(r) => {
                                listRef.current = r;
                            }}
                            data={messages}
                            keyExtractor={(m) => m.id}
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                paddingTop: 12,
                                paddingBottom: showQuick ? 98 : 76,
                                gap: 10,
                            }}
                            renderItem={({ item }) => {
                                const box =
                                    item.role === "user" ? bubble.user : item.role === "assistant" ? bubble.assistant : bubble.system;
                                const tx =
                                    item.role === "user" ? bubble.userText : item.role === "assistant" ? bubble.assistantText : bubble.systemText;

                                return (
                                    <View style={box}>
                                        <Text style={tx}>{item.text}</Text>
                                    </View>
                                );
                            }}
                            onContentSizeChange={() => scrollToEnd(true)}
                            onLayout={() => scrollToEnd(false)}
                            ListFooterComponent={
                                aiSearchLoading ? (
                                    <View style={bubble.assistant}>
                                        <Text style={bubble.assistantText}>AI düşünüyor…</Text>
                                    </View>
                                ) : showResultCards ? (
                                    <ResultCards />
                                ) : (
                                    <View style={{ height: 6 }} />
                                )
                            }
                        />

                        {/* Quick prompts */}
                        {showQuick && (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                                <QuickPromptsRow theme={theme} prompts={quickPrompts} onPress={(p) => sendAi(p)} disabled={aiSearchLoading} />

                                {!!hasText && (
                                    <TouchableOpacity
                                        onPress={() => sendAi(searchTerm)}
                                        disabled={aiSearchLoading}
                                        style={{
                                            marginTop: 10,
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                            backgroundColor: theme.colors.surfaceSoft,
                                            borderRadius: theme.radius.lg,
                                            paddingVertical: 10,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            opacity: aiSearchLoading ? 0.6 : 1,
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>
                                            Arama metnini sor: “{searchTerm.trim().slice(0, 42)}
                                            {searchTerm.trim().length > 42 ? "…" : ""}”
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Composer */}
                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.border,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: theme.colors.background,
                                marginBottom: 40,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: theme.colors.surfaceSoft,
                                        borderRadius: theme.radius.lg,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        minHeight: 46,
                                        justifyContent: "center",
                                    }}
                                >
                                    <TextInput
                                        placeholderTextColor={theme.colors.text.muted}
                                        value={aiQuery}
                                        onChangeText={setAiQuery}
                                        style={{
                                            color: theme.colors.text.primary,
                                            fontSize: 14,
                                            fontWeight: "800",
                                            minHeight: 20,
                                        }}
                                        multiline
                                        returnKeyType="send"
                                        onSubmitEditing={() => {
                                            if (aiQuery.trim()) sendAi(aiQuery);
                                        }}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={() => sendAi(aiQuery)}
                                    disabled={aiSearchLoading || !aiQuery.trim()}
                                    style={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: theme.radius.pill,
                                        backgroundColor: theme.colors.premium,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: aiSearchLoading || !aiQuery.trim() ? 0.55 : 1,
                                    }}
                                >
                                    <Send size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
}

/* -------------------------
   Quick prompts row
------------------------- */
function QuickPromptsRow({
    theme,
    prompts,
    onPress,
    disabled,
}: {
    theme: ThemeUI;
    prompts: string[];
    onPress: (p: string) => void;
    disabled?: boolean;
}) {
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {prompts.map((p) => (
                <TouchableOpacity
                    key={p}
                    onPress={() => onPress(p)}
                    disabled={disabled}
                    activeOpacity={0.85}
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: theme.radius.pill,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        opacity: disabled ? 0.6 : 1,
                    }}
                >
                    <Text style={{ color: theme.colors.text.primary, fontSize: 12, fontWeight: "900" }}>{p}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
