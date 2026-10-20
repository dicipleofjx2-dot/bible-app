import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * 영어 성경단어장 진도. 단어 id 마다 「알아요」「더 학습」 중 하나(없으면 미체크).
 *
 * 이 기기에만 저장한다. 계정에 묶으려면 표를 하나 만들어야 해서 일단 뺐다.
 */
export type VocabMark = 'known' | 'learn';
export type VocabProgress = Record<string, VocabMark>;

const KEY = 'bible-vocab-progress-v1';

export function useVocabProgress() {
  const [progress, setProgress] = useState<VocabProgress>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setProgress(JSON.parse(raw) as VocabProgress);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setMark = useCallback((id: string, mark: VocabMark | undefined) => {
    setProgress((prev) => {
      const next = { ...prev };
      if (mark) next[id] = mark;
      else delete next[id];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { progress, setMark, loaded };
}

/**
 * 영어 읽어주기. 웹 브라우저의 음성만 쓴다 — 폰 앱에서 읽어 주려면 `expo-speech`
 * 를 더하고 앱을 새로 빌드해야 하는데, 그 빌드 한도가 빠듯해서 뒤로 미뤘다.
 * 읽어 줄 수 없는 곳에서는 읽기 단추를 아예 감춘다(`canSpeak`).
 */
export function canSpeak(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}
