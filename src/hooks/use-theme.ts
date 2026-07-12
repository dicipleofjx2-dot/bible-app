/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Skins } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSkin } from '@/lib/skin';

export function useTheme() {
  const scheme = useColorScheme();
  const mode = scheme === 'unspecified' ? 'light' : (scheme ?? 'light');
  const { skinId } = useSkin();

  return Skins[skinId].colors[mode];
}

export function useGradient() {
  const scheme = useColorScheme();
  const mode = scheme === 'unspecified' ? 'light' : (scheme ?? 'light');
  const { skinId } = useSkin();

  return Skins[skinId].gradient[mode];
}
