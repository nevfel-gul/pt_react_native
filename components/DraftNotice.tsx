import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/constants/usetheme';

export default function DraftNotice({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (status === 'idle') return null;
  return <Text accessibilityLiveRegion="polite" style={{ color: status === 'error' ? theme.colors.danger : theme.colors.text.muted, fontSize: 12, marginHorizontal: 16, marginVertical: 8 }}>{t(`draft.${status}`)}</Text>;
}
