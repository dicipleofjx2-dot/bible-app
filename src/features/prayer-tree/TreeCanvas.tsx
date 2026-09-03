import { Image, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { fruitPhotoUrl, type PrayerFruit } from '@/db/prayerTree';
import { fruitLook } from '@/lib/prayerTree';

/** 나무 그림의 세로/가로 비. 왕관이 넉넉해야 열매를 놓을 자리가 생긴다. */
export const TREE_ASPECT = 1.12;

export type TreeCanvasProps = {
  width: number;
  fruits: PrayerFruit[];
  onPressFruit?: (fruit: PrayerFruit) => void;
  /**
   * 나무의 빈 곳을 누른 자리. 0~1 비율로 준다 — 화면 크기가 달라도 같은 자리다.
   * 위치를 고치는 화면에서만 넘긴다.
   */
  onPressCanvas?: (x: number, y: number) => void;
  /** 지금 고르고 있는 열매 — 테두리를 굵게 준다 */
  selectedId?: string | null;
  /** 이름표를 함께 그릴지. 열매가 많으면 꺼서 나무를 본다 */
  showLabels?: boolean;
};

/**
 * 중보기도 나무 한 그루.
 *
 * 나무는 SVG 한 장으로 그리고, **열매는 그 위에 얹은 진짜 View** 다. 열매 안에
 * 사진이 들어가고 누를 수 있어야 하는데, SVG 안에서 그걸 하려면 clipPath 와
 * 좌표 변환을 손으로 해야 한다. 겹쳐 놓으면 사진도 누르기도 평범한 React
 * Native 로 끝난다.
 */
export function TreeCanvas({
  width,
  fruits,
  onPressFruit,
  onPressCanvas,
  selectedId,
  showLabels = true,
}: TreeCanvasProps) {
  const height = width * TREE_ASPECT;

  function handleCanvasPress(e: GestureResponderEvent) {
    if (!onPressCanvas) return;
    const { locationX, locationY } = e.nativeEvent;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    onPressCanvas(
      Math.min(1, Math.max(0, locationX / width)),
      Math.min(1, Math.max(0, locationY / height)),
    );
  }

  return (
    <View style={{ width, height }}>
      <Pressable
        onPress={handleCanvasPress}
        disabled={!onPressCanvas}
        style={StyleSheet.absoluteFill}
        accessibilityLabel="기도나무">
        <Svg width={width} height={height} viewBox="0 0 100 112">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#EAF3E4" />
              <Stop offset="1" stopColor="#F7EFE3" />
            </LinearGradient>
            <LinearGradient id="bark" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#6B4A31" />
              <Stop offset="0.55" stopColor="#8A6242" />
              <Stop offset="1" stopColor="#5C3F2A" />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width="100" height="112" rx="6" fill="url(#sky)" />

          {/* 땅 */}
          <Ellipse cx="50" cy="105" rx="42" ry="6" fill="#CBBF9C" opacity={0.55} />

          {/* 잎 덩어리를 여러 겹으로 겹친다. 하나짜리 원은 나무가 아니라 사탕처럼 보인다. */}
          <Ellipse cx="50" cy="34" rx="34" ry="27" fill="#4E7C41" />
          <Ellipse cx="27" cy="47" rx="21" ry="17" fill="#3F6A37" />
          <Ellipse cx="73" cy="47" rx="21" ry="17" fill="#3F6A37" />
          <Ellipse cx="50" cy="52" rx="30" ry="18" fill="#568A47" />
          <Ellipse cx="38" cy="28" rx="16" ry="12" fill="#5F9750" opacity={0.75} />
          <Ellipse cx="64" cy="32" rx="14" ry="10" fill="#69A257" opacity={0.6} />

          {/* 줄기와 가지 */}
          <Path
            d="M45 104 C45 86 44 74 46 62 L54 62 C56 74 55 86 55 104 Z"
            fill="url(#bark)"
          />
          <Path d="M48 68 C40 62 34 58 28 54" stroke="#6B4A31" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M52 66 C60 61 66 57 72 53" stroke="#6B4A31" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M50 60 C50 52 50 46 50 40" stroke="#6B4A31" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* 뿌리 언저리 */}
          <Circle cx="50" cy="104" r="2" fill="#5C3F2A" />
        </Svg>
      </Pressable>

      {fruits.map((fruit) => {
        const answered = fruit.topics.filter((t) => t.answered).length;
        const look = fruitLook(fruit.topics.length, answered);
        const photo = fruitPhotoUrl(fruit.photo_path);
        const selected = selectedId === fruit.id;
        const left = fruit.pos_x * width - look.size / 2;
        const top = fruit.pos_y * height - look.size / 2;

        return (
          <View key={fruit.id} style={[styles.fruitSlot, { left, top }]}>
            <Pressable
              onPress={() => onPressFruit?.(fruit)}
              accessibilityRole="button"
              accessibilityLabel={`${fruit.name} · ${answered}/${fruit.topics.length} 응답`}
              style={({ pressed }) => [
                styles.fruit,
                {
                  width: look.size,
                  height: look.size,
                  borderRadius: look.size / 2,
                  backgroundColor: look.color,
                  borderColor: selected ? '#FFFFFF' : look.outline,
                  borderWidth: selected ? 3 : 2,
                  opacity: pressed ? 0.7 : 1,
                  // 다 익은 열매만 빛을 두른다 — 「이 사람은 다 응답됐다」가
                  // 나무를 멀리서 봐도 보이게.
                  // 흰 테를 한 겹 둘러 잎에서 떼어 놓는다. 그 위에 다 익은
                  // 열매만 제 색으로 빛나게 해서 멀리서도 먼저 눈에 걸리게 한다.
                  boxShadow: look.fullyRipe
                    ? `0px 0px 0px 2px rgba(255,255,255,0.75), 0px 0px 12px ${look.color}`
                    : '0px 0px 0px 2px rgba(255,255,255,0.6), 0px 2px 4px rgba(60,40,25,0.4)',
                },
              ]}>
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={{
                    width: look.size - 8,
                    height: look.size - 8,
                    borderRadius: (look.size - 8) / 2,
                  }}
                />
              ) : (
                <ThemedText
                  style={[
                    styles.initial,
                    {
                      fontSize: Math.max(11, look.size * 0.36),
                      // 덜 익은 열매는 밝아서 흰 글자가 안 읽힌다. 색이 익어
                      // 어두워지는 지점에서 글자색을 바꾼다.
                      color: look.ratio < 0.4 ? '#4A3A22' : '#FFFFFF',
                    },
                  ]}>
                  {fruit.name.trim().slice(0, 1) || '?'}
                </ThemedText>
              )}
            </Pressable>
            {showLabels ? (
              <View style={styles.labelWrap}>
                <ThemedText style={styles.label} numberOfLines={1}>
                  {fruit.name}
                </ThemedText>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fruitSlot: {
    position: 'absolute',
    alignItems: 'center',
  },
  fruit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
  },
  labelWrap: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(30,22,16,0.55)',
    maxWidth: 84,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 15,
  },
});
