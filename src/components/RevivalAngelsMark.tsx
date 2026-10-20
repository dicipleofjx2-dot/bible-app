import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/**
 * 부흥의 천사들 표식 — 홈 바둑판에 올리는 동그란 그림.
 *
 * 포스터 사진을 그대로 줄여 쓰던 자리다. 68px 받침 안에서는 포스터의 글씨와
 * 인물이 뭉개져 **무슨 그림인지 알 수 없는 얼룩**이 됐다. 그래서 그 자리에는
 * 작게 줄여도 버티는 표식을 따로 그린다 — 후광, 머리, 옷, 그리고 금빛 두 날개.
 * 포스터 자체는 사역 화면(revival/index, revival/[kind]) 배경에 그대로 쓴다.
 *
 * **그림 파일이 아니라 선으로 그린다.** 가로세로가 얼마든 흐려지지 않고,
 * 화면이 밝든 어둡든 같은 색으로 선다(남빛 바탕을 제가 깔고 있어서다).
 *
 * 좌우 날개는 한 모양을 x축으로 뒤집은 것이다. 뒤집기를 그림 그릴 때마다
 * 하지 않고 **좌표를 미리 뒤집어** 적어 둔다 — 안드로이드와 웹에서 transform
 * 이 서로 다르게 먹는 일을 겪지 않으려는 것이다.
 */

/** 깃 끝이 늘어선 아래 가장자리까지 한 붓에. 오른쪽(x>50) 날개. */
const WING_RIGHT =
  'M50.5 57.5 C55 44 65 29 79 21.5 C83 19.2 86 20 86.4 23.5 C86.9 27.8 85 32 81 36 ' +
  'Q79.9 42.7 73.5 45 Q71.4 51.1 65 52 Q62.3 57.3 56.5 56.5 Q54.1 60.4 50.5 57.5 Z';
const WING_LEFT =
  'M49.5 57.5 C45 44 35 29 21 21.5 C17 19.2 14 20 13.6 23.5 C13.1 27.8 15 32 19 36 ' +
  'Q20.1 42.7 26.5 45 Q28.6 51.1 35 52 Q37.7 57.3 43.5 56.5 Q45.9 60.4 49.5 57.5 Z';

/** 깃을 나누는 결. 두 줄이면 깃털로 보이고, 더 그으면 밀 이삭처럼 보인다. */
const VEINS_RIGHT = ['M55 54.5 C61 45 69 34.5 79.5 26.5', 'M60.5 57 C66.5 49 73 40.5 82 32.5'];
const VEINS_LEFT = ['M45 54.5 C39 45 31 34.5 20.5 26.5', 'M39.5 57 C33.5 49 27 40.5 18 32.5'];

export function RevivalAngelsMark({ size = 66 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="revivalSky" cx="50%" cy="28%" r="78%">
          <Stop offset="0%" stopColor="#3A6CBD" />
          <Stop offset="55%" stopColor="#17326E" />
          <Stop offset="100%" stopColor="#071636" />
        </RadialGradient>
        {/* 천사 뒤에서 번지는 빛. 머리와 날개 사이를 띄워 준다. */}
        <RadialGradient id="revivalGlow" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="#FFF0C4" stopOpacity="0.95" />
          <Stop offset="38%" stopColor="#FFD468" stopOpacity="0.32" />
          <Stop offset="100%" stopColor="#FFC94D" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="revivalGold" x1="0.1" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#FFF4D0" />
          <Stop offset="40%" stopColor="#F9CE4C" />
          <Stop offset="100%" stopColor="#D28F17" />
        </LinearGradient>
        <LinearGradient id="revivalRobe" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="55%" stopColor="#EFF5FF" />
          <Stop offset="100%" stopColor="#BFD2F0" />
        </LinearGradient>
      </Defs>

      <Circle cx="50" cy="50" r="50" fill="url(#revivalSky)" />
      <Circle cx="50" cy="40" r="42" fill="url(#revivalGlow)" />

      <G>
        <Path d={WING_RIGHT} fill="url(#revivalGold)" />
        <Path d={WING_LEFT} fill="url(#revivalGold)" />
        <G stroke="#C98B16" strokeOpacity={0.4} strokeWidth={1} strokeLinecap="round" fill="none">
          {[...VEINS_RIGHT, ...VEINS_LEFT].map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
      </G>

      {/* 후광 · 머리 · 옷. 날개보다 나중에 그려 앞에 선다. */}
      <Ellipse cx="50" cy="30.5" rx="7.6" ry="2.5" fill="none" stroke="#FFE9A8" strokeWidth={1.7} />
      <Circle cx="50" cy="39.5" r="5.6" fill="url(#revivalRobe)" />
      <Path
        d="M44.4 48 C46.5 45.6 53.5 45.6 55.6 48 L61.5 70.5 Q50 76 38.5 70.5 Z"
        fill="url(#revivalRobe)"
      />

      <Circle cx="23" cy="25" r="1.5" fill="#FFF3C9" />
      <Circle cx="79" cy="20" r="1.1" fill="#FFF3C9" />
      <Circle cx="15" cy="57" r="1" fill="#FFF3C9" fillOpacity={0.7} />
    </Svg>
  );
}
