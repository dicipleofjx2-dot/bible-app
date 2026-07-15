import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGradient } from '@/hooks/use-theme';
import { getTodayLabelKST } from '@/lib/hebrew-date';

export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>홈</TabButton>
          </TabTrigger>
          <TabTrigger name="meditation" href="/meditation" asChild>
            <TabButton>말씀묵상</TabButton>
          </TabTrigger>
          <TabTrigger name="word-notes" href="/word-notes" asChild>
            <TabButton>말씀노트</TabButton>
          </TabTrigger>
          <TabTrigger name="read" href="/read" asChild>
            <TabButton>읽기</TabButton>
          </TabTrigger>
          <TabTrigger name="bible-reading" href="/bible-reading" asChild>
            <TabButton>성경통독</TabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>검색</TabButton>
          </TabTrigger>
          <TabTrigger name="notes" href="/notes" asChild>
            <TabButton>암송구절</TabButton>
          </TabTrigger>
          <TabTrigger name="commentary" href="/commentary" asChild>
            <TabButton>주석</TabButton>
          </TabTrigger>
          <TabTrigger name="community" href="/community" asChild>
            <TabButton>커뮤니티</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={styles.tabSlot} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const gradient = useGradient();

  if (isFocused) {
    return (
      <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabButtonView}>
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
        <ThemedText type="small" themeColor="textSecondary">
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  // 홈 화면은 자체 타이틀/달력 위젯을 가지므로 이 상단 툴바 전체를 숨긴다.
  // TabTrigger들은 라우트 등록을 위해 언마운트하지 않고 display:none으로만 숨김.
  const isHome = usePathname() === '/';

  return (
    <View {...props} style={[styles.tabListContainer, isHome && styles.hidden]}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <Pressable
          onPress={() => router.push('/calendar')}
          hitSlop={8}
          style={({ pressed }) => [styles.calendarButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            📅 {getTodayLabelKST()}
          </ThemedText>
        </Pressable>

        {props.children}
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
  hidden: {
    display: 'none',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  calendarButton: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonTextFocused: {
    color: '#ffffff',
  },
});
