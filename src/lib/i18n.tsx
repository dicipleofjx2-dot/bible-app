import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { STRINGS, type StringKey } from '@/constants/strings';

/**
 * 앱 언어.
 *
 * 필리핀 성도가 늘고 있어 화면을 영어로도 읽을 수 있어야 한다. 성경 본문은
 * 이것과 별개다 — 역본은 읽기 화면에서 따로 고른다(따갈로그도 거기 있다).
 */
export type Lang = 'ko' | 'en';

const STORAGE_KEY = 'bibleapp.lang';

type I18nValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  /**
   * 문구 하나를 그 언어로.
   *
   * 아직 영어를 안 적은 문구는 **한글 그대로** 나온다. 66개 화면을 한 번에
   * 옮길 수 없어 자주 쓰는 화면부터 늘려 가는데, 빈 자리를 빈칸으로 두면
   * 화면이 무너진다. 한글이라도 보이는 편이 낫다.
   */
  t: (key: StringKey) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: 'ko',
  setLang: () => {},
  t: (key) => STRINGS[key]?.ko ?? key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'ko' || stored === 'en') setLangState(stored);
      })
      .catch(() => {});
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => {
        const entry = STRINGS[key];
        if (!entry) return key;
        return (lang === 'en' ? entry.en : entry.ko) || entry.ko;
      },
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** 문구만 필요할 때 짧게 쓰는 길. */
export function useT() {
  return useContext(I18nContext).t;
}
