import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="meditation">
        <NativeTabs.Trigger.Label>말씀묵상</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="heart.text.square.fill" md="self_improvement" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="word-notes">
        <NativeTabs.Trigger.Label>말씀노트</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.and.pencil" md="edit_note" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="read">
        <NativeTabs.Trigger.Label>읽기</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bible-reading">
        <NativeTabs.Trigger.Label>성경통독</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event_available" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>검색</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notes">
        <NativeTabs.Trigger.Label>암송구절</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="highlighter" md="edit_note" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="commentary">
        <NativeTabs.Trigger.Label>주석</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="text.book.closed.fill" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="community">
        <NativeTabs.Trigger.Label>커뮤니티</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
