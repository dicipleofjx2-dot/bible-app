import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_SKIN, Skins, type SkinId } from '@/constants/theme';

const STORAGE_KEY = 'bibleapp.skin';

type SkinContextValue = {
  skinId: SkinId;
  setSkinId: (id: SkinId) => void;
};

const SkinContext = createContext<SkinContextValue>({
  skinId: DEFAULT_SKIN,
  setSkinId: () => {},
});

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setSkinIdState] = useState<SkinId>(DEFAULT_SKIN);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in Skins) setSkinIdState(stored as SkinId);
    });
  }, []);

  function setSkinId(id: SkinId) {
    setSkinIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }

  const value = useMemo(() => ({ skinId, setSkinId }), [skinId]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  return useContext(SkinContext);
}
