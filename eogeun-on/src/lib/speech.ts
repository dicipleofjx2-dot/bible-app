import * as Speech from 'expo-speech';

/**
 * 발음 — 기기의 영어 음성(TTS)으로 읽는다. 원어민 녹음(§5-3)은 콘텐츠 검수와
 * 함께 들어올 자리이고, 그때 이 함수만 녹음 재생으로 바꾸면 된다.
 */
export function speak(text: string, slow = false): void {
  Speech.stop();
  Speech.speak(text.replace(/\[|\]/g, ''), { language: 'en-US', rate: slow ? 0.7 : 0.9 });
}
