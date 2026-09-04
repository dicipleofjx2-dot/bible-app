import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { fruitPhotoUrl, type PrayerFruit } from '@/db/prayerTree';
import { fruitLook, prayedToday } from '@/lib/prayerTree';
import { buildTree, leafColor } from '@/lib/treeShape';

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
  // 가지·잎은 씨앗이 같으면 언제나 같은 모양이다. 그려 둔 것을 다시 쓴다 —
  // 열매를 하나 누를 때마다 수백 개의 잎을 다시 셈할 이유가 없다.
  const tree = useMemo(() => buildTree(), []);

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
          </Defs>

          <Rect x="0" y="0" width="100" height="112" rx="6" fill="url(#sky)" />

          {/* 땅과 그림자 */}
          <Ellipse cx={tree.base.x} cy={tree.base.y} rx="40" ry="5.5" fill="#CBBF9C" opacity={0.5} />
          <Ellipse cx={tree.base.x} cy={tree.base.y} rx="15" ry="2.6" fill="#A8977A" opacity={0.45} />

          {/* 가지 — 굵은 것부터 그려야 갈라지는 자리가 자연스럽게 이어진다 */}
          {tree.branches.map((branch, i) => (
            <Path
              key={`b${i}`}
              d={branch.d}
              stroke={branch.depth === 0 ? '#5C3F2A' : branch.depth < 3 ? '#6B4A31' : '#7A583C'}
              strokeWidth={branch.width}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* 줄기의 그늘 — 굵은 가지 한쪽에 어두운 선을 겹쳐 둥글어 보이게 */}
          {tree.branches
            .filter((branch) => branch.depth <= 1)
            .map((branch, i) => (
              <Path
                key={`s${i}`}
                d={branch.d}
                stroke="#422C1D"
                strokeWidth={branch.width * 0.4}
                strokeLinecap="round"
                opacity={0.5}
                fill="none"
                transform={`translate(${(branch.width * 0.26).toFixed(2)},0)`}
              />
            ))}

          {/* 잎 — 어두운 것부터 얹어 안쪽이 그늘지게. 정원이 아니라 살짝 눌린
              타원이라야 잎덩이처럼 보인다. */}
          {tree.leaves.map((leaf, i) => (
            <Ellipse
              key={`l${i}`}
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.r}
              ry={leaf.r * 0.82}
              fill={leafColor(leaf.tone)}
              opacity={0.94}
            />
          ))}
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
                  {/* 오늘 기도한 사람은 이름 앞에 표를 둔다 — 나무만 보고도
                      「오늘 어디까지 돌았는지」가 읽힌다. */}
                  {prayedToday(fruit.last_prayed_at) ? `🙏 ${fruit.name}` : fruit.name}
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
    maxWidth: 96,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 15,
  },
});
