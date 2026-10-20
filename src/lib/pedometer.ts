import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/**
 * 만보기 — 기기에서 걸음 수를 받아 오는 자리.
 *
 * ── 왜 플랫폼마다 다르게 하는가 ─────────────────────────────────────
 * 걸음은 **기기가 세 주는 것**이고, 그 방식이 셋 다 다르다.
 *
 *   · 아이폰 — 운영체제가 늘 세고 있다(7일치를 보관한다). 그래서 앱을 꺼 두어도
 *     「오늘 몇 걸음」을 통째로 물어볼 수 있다. 가장 정확하다.
 *   · 안드로이드 — expo-sensors 는 **앱을 켠 동안** 걸은 것만 센다. 지난 걸음을
 *     돌려받으려면 Health Connect(삼성헬스 같은 앱이 쌓아 둔 기록)를 읽어야 하는데
 *     그건 따로 붙여야 하는 길이라 지금은 켜 둔 동안만 센다. 쌓인 수는 서버에
 *     남으니 하루 종일 조금씩 더해진다.
 *   · 웹 — 브라우저는 걸음 수를 모른다. 손으로 적는 길만 둔다.
 *
 * 그래서 화면은 「얼마나 믿을 수 있는 수인가」를 함께 알려 줘야 한다. 안드로이드에서
 * 3천 걸음이라고 적혀 있는데 사실은 앱을 켠 10분 동안의 수라면, 사용자는 만보기가
 * 고장 났다고 여긴다. `kind` 를 돌려주는 까닭이 이것이다.
 */

export type PedometerKind =
  /** 운영체제가 하루치를 통째로 알려 준다(아이폰) */
  | 'day'
  /** 앱을 켠 동안만 센다(안드로이드) */
  | 'live'
  /** 셀 수 없다 — 손으로 적는다(웹) */
  | 'manual';

export function pedometerKind(): PedometerKind {
  if (Platform.OS === 'ios') return 'day';
  if (Platform.OS === 'android') return 'live';
  return 'manual';
}

/** 이 기기에 걸음 센서가 있는가. 없으면 손으로 적는 길로 보낸다. */
export async function pedometerAvailable(): Promise<boolean> {
  if (pedometerKind() === 'manual') return false;
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * 걸음을 세도 되는지 묻는다.
 *
 * 안드로이드는 「신체 활동」, 아이폰은 「동작 및 피트니스」다. 거절하면 거절한
 * 대로 둔다 — 다시 묻지 않는다. 손으로 적는 길이 있으니 막다른 길이 아니다.
 */
export async function askPedometerPermission(): Promise<boolean> {
  try {
    const now = await Pedometer.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    const asked = await Pedometer.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** 오늘 0시. 하루의 시작은 기기의 시간대로 센다 — 사용자가 사는 시간이 그것이다. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 오늘 걸은 수. 아이폰에서만 답이 있다(`kind === 'day'`).
 *
 * 돌려주는 값이 null 이면 「모른다」는 뜻이다. 0 과 구별해야 한다 — 0 을 서버에
 * 적으면 이미 쌓인 걸음을 0 으로 덮을 뻔한다.
 */
export async function readTodaySteps(): Promise<number | null> {
  if (pedometerKind() !== 'day') return null;
  try {
    const { steps } = await Pedometer.getStepCountAsync(startOfToday(), new Date());
    return Number.isFinite(steps) ? steps : null;
  } catch {
    return null;
  }
}

/**
 * 지금부터 걷는 것을 지켜본다(안드로이드).
 *
 * 돌려주는 수는 **지켜보기 시작한 뒤로 걸은 수**다. 하루 총합이 아니다. 부르는
 * 쪽에서 이미 적혀 있던 수에 더해 쓴다.
 *
 * 돌려주는 함수를 부르면 그만 지켜본다. 화면을 떠날 때 반드시 불러야 한다 —
 * 안 그러면 화면을 열 때마다 센서 구독이 하나씩 늘어 배터리를 먹는다.
 */
export function watchSteps(onSteps: (sinceStart: number) => void): () => void {
  if (pedometerKind() === 'manual') return () => {};
  try {
    const sub = Pedometer.watchStepCount(({ steps }) => onSteps(steps));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
