import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/constants/strings';
import { useT } from '@/lib/i18n';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import { blogUrlForChapter } from '@/lib/readingHelper/blog';

/** 「더 알고 싶을 때」 블로그로 가는 단추. 장 번호가 없으면(옛 캐시 등) 그리지 않는다. */
export function BlogLink({ chapter, label }: { chapter?: number; label: StringKey }) {
  const theme = useTheme();
  const t = useT();
  if (!chapter) return null;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => openAppWindow(blogUrlForChapter(chapter), APP_WINDOW.bible365)}
      style={({ pressed }) => [styles.row, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
      <View style={styles.text}>
        <ThemedText type="smallBold">{t(label)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('blog365.site')}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor="backgroundSelected">
        ↗
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 56,
    alignSelf: 'stretch',
  },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
