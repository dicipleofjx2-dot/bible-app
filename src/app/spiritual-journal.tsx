import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';

export default function SpiritualJournalScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <ComingSoon emoji="❤️‍🔥" title="영성일기" date={date} />;
}
