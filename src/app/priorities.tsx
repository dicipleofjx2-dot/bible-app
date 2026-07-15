import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';

export default function PrioritiesScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <ComingSoon emoji="📊" title="우선순위" date={date} />;
}
