import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { fruitPhotoUrl, type PrayerFruit } from '@/db/prayerTree';
import { fruitLook } from '@/lib/prayerTree';

/** 상자에 담긴 열매는 크기를 하나로 맞춘다 — 다 익어서 딴 것들이니 다 자란 것이다. */
const BOX_FRUIT = 34;
const GAP = 6;
const PAD = 10;
/** 바닥 널과 테두리에 쓰는 세로 여유 */
const RIM = 14;

export type FruitBoxProps = {
  width: number;
  /** 딴 차례대로(오래된 것 먼저). 아래 칸부터 채운다 */
  fruits: PrayerFruit[];
  onPressFruit?: (fruit: PrayerFruit) => void;
};

/**
 * 과일상자 — 다 익어서 딴 열매를 쌓아 두는 곳.
 *
 * **아래 줄부터 채운다.** 먼저 딴 열매가 바닥에 깔리고 새 열매가 그 위에
 * 얹혀야 「차곡차곡 쌓인다」로 읽힌다. 그래서 줄을 손으로 나눠 뒤집는다 —
 * flexWrap 에 맡기면 위 줄부터 채워져 새 열매가 아래로 밀린다.
 */
export function FruitBox({ width, fruits, onPressFruit }: FruitBoxProps) {
  const inner = Math.max(BOX_FRUIT, width - PAD * 2);
  const perRow = Math.max(1, Math.floor((inner + GAP) / (BOX_FRUIT + GAP)));

  const rows: PrayerFruit[][] = [];
  for (let i = 0; i < fruits.length; i += perRow) rows.push(fruits.slice(i, i + perRow));
  // 마지막(가장 최근) 줄이 맨 위로 가도록 뒤집는다.
  const stacked = rows.slice().reverse();

  // 빈 상자도 자리를 지킨다 — 「여기에 쌓인다」를 먼저 보여 줘야 무엇인지 안다.
  const rowCount = Math.max(1, stacked.length);
  const height = rowCount * BOX_FRUIT + (rowCount - 1) * GAP + PAD * 2 + RIM;

  return (
    <View style={{ width }}>
      <View style={{ width, height }}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="crate" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C08A4E" />
              <Stop offset="1" stopColor="#9A6C3A" />
            </LinearGradient>
            <LinearGradient id="crateInside" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5E4025" />
              <Stop offset="1" stopColor="#7A5330" />
            </LinearGradient>
          </Defs>

          {/* 상자 몸통 */}
          <Rect x="1" y="1" width={width - 2} height={height - 2} rx="9" fill="url(#crate)" />
          {/* 안쪽 — 열매가 여기에 담긴다. 어두워야 담긴 것으로 보인다. */}
          <Rect
            x="7"
            y="7"
            width={width - 14}
            height={height - RIM - 8}
            rx="6"
            fill="url(#crateInside)"
          />
          {/* 앞널 두 장. 나뭇결 선 두 줄이면 상자로 읽힌다. */}
          <Path
            d={`M8 ${height - RIM + 2} H${width - 8}`}
            stroke="#7C5228"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.8}
          />
          <Path
            d={`M8 ${height - 7} H${width - 8}`}
            stroke="#7C5228"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.5}
          />
          {/* 모서리 기둥 */}
          <Rect x="3" y="3" width="7" height={height - 6} rx="3" fill="#B07C46" />
          <Rect x={width - 10} y="3" width="7" height={height - 6} rx="3" fill="#B07C46" />
        </Svg>

        <View style={[styles.stack, { padding: PAD, paddingBottom: RIM + 6 }]}>
          {fruits.length === 0 ? (
            <ThemedText type="small" style={styles.emptyText}>
              다 익은 열매를 따서 여기에 담아요
            </ThemedText>
          ) : (
            stacked.map((row, rowIndex) => (
              <View key={`r${rowIndex}`} style={[styles.row, { gap: GAP, marginTop: rowIndex === 0 ? 0 : GAP }]}>
                {row.map((fruit) => {
                  const look = fruitLook(fruit.topics.length, fruit.topics.filter((t) => t.answered).length);
                  const photo = fruitPhotoUrl(fruit.photo_path);
                  return (
                    <Pressable
                      key={fruit.id}
                      onPress={() => onPressFruit?.(fruit)}
                      accessibilityRole="button"
                      accessibilityLabel={`${fruit.name} · 응답받아 딴 열매`}
                      style={({ pressed }) => [
                        styles.fruit,
                        {
                          backgroundColor: look.color,
                          borderColor: look.outline,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.photo} />
                      ) : (
                        <ThemedText style={styles.initial}>
                          {fruit.name.trim().slice(0, 1) || '?'}
                        </ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  row: { flexDirection: 'row', justifyContent: 'center' },
  fruit: {
    width: BOX_FRUIT,
    height: BOX_FRUIT,
    borderRadius: BOX_FRUIT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 1px 3px rgba(60,40,25,0.4)',
  },
  photo: { width: BOX_FRUIT - 8, height: BOX_FRUIT - 8, borderRadius: (BOX_FRUIT - 8) / 2 },
  initial: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#E4CDB4', textAlign: 'center' },
});
