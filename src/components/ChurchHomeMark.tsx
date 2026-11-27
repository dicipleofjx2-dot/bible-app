import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * 새부대교회 홈페이지 표식 — 홈 바둑판의 동그란 그림.
 *
 * 포도(새 포도주) 빛 바탕 위에 십자가를 인 예배당. 선으로 그려 68px 받침에서도
 * 흐려지지 않고, 밝은/어두운 모드 모두 바탕을 스스로 깔아 같은 색으로 선다.
 */
export function ChurchHomeMark({ size = 66 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="chSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8A5BC4" />
          <Stop offset="100%" stopColor="#3C1F6E" />
        </LinearGradient>
        <LinearGradient id="chWall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E3D6F5" />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#chSky)" />
      {/* 십자가 */}
      <Rect x="48.2" y="12" width="3.6" height="20" rx="1" fill="#FFD468" />
      <Rect x="42" y="18" width="16" height="3.6" rx="1" fill="#FFD468" />
      {/* 지붕 · 벽 */}
      <Path d="M24 54 L50 32 L76 54 Z" fill="#5E3A9A" stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x="29" y="54" width="42" height="26" fill="url(#chWall)" />
      {/* 문 · 창 */}
      <Path d="M44 80 V66 Q50 59 56 66 V80 Z" fill="#7A4DB5" />
      <Circle cx="50" cy="48" r="3.4" fill="#FFD468" />
      <Rect x="33" y="60" width="6" height="9" rx="3" fill="#B79BDD" />
      <Rect x="61" y="60" width="6" height="9" rx="3" fill="#B79BDD" />
      <Rect x="20" y="80" width="60" height="3" rx="1.5" fill="#FFFFFF" fillOpacity={0.85} />
    </Svg>
  );
}
