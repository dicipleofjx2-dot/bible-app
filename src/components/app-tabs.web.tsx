import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { BookOpen, House, MoreHorizontal, Sprout, Target, type LucideIcon } from 'lucide-react-native';
import { Pressable, View, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGradient, useTheme } from '@/hooks/use-theme';
import { getTodayLabelKST } from '@/lib/hebrew-date';
import type { Href } from 'expo-router';

const TAB_ITEMS: { name: string; href: Href; label: string; Icon: LucideIcon }[] = [
  { name: 'home', href: '/', label: '홈', Icon: House },
  { name: 'word', href: '/word', label: '말씀', Icon: BookOpen },
  { name: 'bible-reading', href: '/bible-reading', label: 'R2M', Icon: Target },
  { name: 'growth', href: '/growth', label: '성장', Icon: Sprout },
  { name: 'more', href: '/more', label: '더보기', Icon: MoreHorizontal },
];

export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabList asChild>
        <CustomTabList>
          {TAB_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <TabButton icon={item.Icon}>{item.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
      <TabSlot style={styles.tabSlot} />
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: LucideIcon };

export function TabButton({ children, icon: Icon, isFocused, ...props }: TabButtonProps) {
  const gradient = useGradient();
  const theme = useTheme();

  if (isFocused) {
    return (
      <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabButtonView}>
          <Icon size={18} color="#ffffff" strokeWidth={1.75} />
          <ThemedText type="small" style={styles.tabButtonTextFocused}>
            {children}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.tabButtonView}>
        <Icon size={18} color={theme.textSecondary} strokeWidth={1.75} />
        <ThemedText type="small" themeColor="textSecondary">
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <Pressable
          onPress={() => router.push('/calendar')}
          hitSlop={8}
          style={({ pressed }) => [styles.calendarButton, pressed && styles.pressed]}>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            numberOfLines={1}
            ellipsizeMode="tail">
            📅 {getTodayLabelKST()}
          </ThemedText>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}>
          {props.children}
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  tabSlot: {
    flex: 1,
  },
  tabListContainer: {
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    // RN's default flexShrink is 0 (unlike web CSS's 1) — without this,
    // this row refused to shrink below its content width on narrow
    // viewports and just overflowed tabListContainer's centered layout
    // (spilling off both edges) instead of ever handing overflow to the
    // ScrollView below, so the horizontal scroll never actually engaged.
    flexShrink: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  calendarButton: {
    // Capped + shrinkable (not flexShrink:0) so a long date string (KST +
    // Hebrew date) can never eat the whole row on a narrow viewport or with
    // larger system font scaling — it truncates instead of starving the
    // tab ScrollView down to zero width and making every tab disappear.
    flexShrink: 1,
    maxWidth: '40%',
  },
  tabScroll: {
    // minWidth 0 lets this shrink below its content width on web flexbox,
    // otherwise the row overflows the pill instead of scrolling.
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonTextFocused: {
    color: '#ffffff',
  },
});
