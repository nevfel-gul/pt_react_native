import type { ThemeUI } from '@/constants/types';
import { useTheme } from '@/constants/usetheme';
import { track } from '@/services/analytics';
import { auth } from '@/services/firebase';
import {
  firstName,
  openWhatsApp,
  toWhatsAppNumber,
  type WhatsAppTemplateId,
  type WhatsAppVars,
} from '@/services/whatsapp';
import { MessageCircle } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// WhatsApp hazır mesaj seçici. Hoca şablonu seçer, metni isterse
// düzenler, "WhatsApp'ta aç" ile mesaj yazılmış halde WhatsApp açılır.
//
//   <WhatsAppSheet visible phone={student.number} vars={{ name }} templates={[...]} />
// ─────────────────────────────────────────────────────────────

export default function WhatsAppSheet({
  visible,
  onClose,
  phone,
  vars,
  templates,
  source,
}: {
  visible: boolean;
  onClose: () => void;
  phone?: string | null;
  vars: WhatsAppVars;
  templates: WhatsAppTemplateId[];
  /** Analitik için: hangi ekrandan açıldı. */
  source: 'student' | 'calendar' | 'package';
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [selected, setSelected] = useState<WhatsAppTemplateId>(templates[0]);
  const [text, setText] = useState('');

  const coach = auth.currentUser?.displayName ? firstName(auth.currentUser.displayName) : '';
  const fill = (id: WhatsAppTemplateId) =>
    t(`whatsapp.template.${id}.text`, {
      ...vars,
      name: firstName(vars.name) || vars.name,
      coach,
    });

  useEffect(() => {
    if (!visible) return;
    setSelected(templates[0]);
    setText(fill(templates[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const number = toWhatsAppNumber(phone);

  const send = async () => {
    if (!number) {
      Alert.alert(t('whatsapp.noPhone.title'), t('whatsapp.noPhone.message'));
      return;
    }
    track('whatsapp_message_opened', { template: selected, source, edited: text !== fill(selected) });
    try {
      await openWhatsApp(number, text);
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('whatsapp.openError'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.titleRow}>
                <MessageCircle size={20} color="#25D366" />
                <Text style={styles.title}>{t('whatsapp.title')}</Text>
              </View>
              <Text style={styles.muted}>
                {number ? t('whatsapp.to', { name: vars.name, phone: `+${number}` }) : t('whatsapp.noPhone.message')}
              </Text>

              <View style={styles.chipRow}>
                {templates.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.chip, selected === id && styles.chipActive]}
                    onPress={() => {
                      setSelected(id);
                      setText(fill(id));
                    }}
                  >
                    <Text style={[styles.chipText, selected === id && styles.chipTextActive]}>
                      {t(`whatsapp.template.${id}.label`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>{t('whatsapp.editHint')}</Text>

              <TouchableOpacity style={[styles.sendBtn, !number && { opacity: 0.5 }]} onPress={send}>
                <MessageCircle size={18} color="#fff" />
                <Text style={styles.sendText}>{t('whatsapp.open')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={styles.link}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      padding: 20,
      maxHeight: '90%',
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: theme.colors.text.primary, fontSize: theme.fontSize.title, fontWeight: '800' },
    muted: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    chipActive: { backgroundColor: '#25D366', borderColor: '#25D366' },
    chipText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    input: {
      marginTop: 14,
      minHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: 12,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.surfaceSoft,
      fontSize: theme.fontSize.md,
      lineHeight: 21,
    },
    hint: { color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: 6 },
    sendBtn: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: theme.radius.pill,
      backgroundColor: '#25D366',
    },
    sendText: { color: '#fff', fontWeight: '800', fontSize: theme.fontSize.md },
    link: { color: theme.colors.accent, fontSize: theme.fontSize.sm, fontWeight: '700' },
  });
}
