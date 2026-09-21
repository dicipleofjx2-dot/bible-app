import { DarkTheme, LightTheme, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): { palette: Palette; dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { palette: dark ? DarkTheme : LightTheme, dark };
}
