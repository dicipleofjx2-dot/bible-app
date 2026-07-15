import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';

export default function KingdomFinanceScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <ComingSoon emoji="🪙" title="천국재정" date={date} />;
}
