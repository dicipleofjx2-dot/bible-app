// 절기 하프타라 — 절기와 특별 안식일에 읽는 예언서 본문(그리고 그 날의 토라 독서).
//
// ── 왜 따로 두나 ────────────────────────────────────────────────────
// 파라샤 54편의 짝(haftarah.json)은 **보통 안식일**의 것이다. 절기가 겹치면
// 다른 것을 읽는다. 두 갈래다.
//
//  1. **특별 안식일** — 토라는 그 주 파라샤 그대로 읽고 **하프타라만 바뀐다**
//     (샤밧 하가돌·슈바·셰칼림·자코르·파라·하호데쉬·초하루·하누카 안식일).
//  2. **절기 그 날** — 토라도 그 절기의 것을 읽는다(유월절·오순절·초막절·
//     로쉬 하샤나·욤 키푸르·심핫 토라…). 그런 날은 파라샤를 아예 안 읽는다.
//
// 하프타라가 있는 것만 담는다 — 평일 하누카·초하루의 토라 독서까지 담으면
// 표가 몇 배로 커지는데 「이어 읽는 예언서」를 보러 온 사람에게는 쓸모가 없다.
//
// ── 절 번호 ─────────────────────────────────────────────────────────
// build-haftarah.mjs 와 같은 이유로 개역개정으로 옮긴다. 절기 쪽에서 새로
// 걸리는 자리: 말라기 3:24→**4:6**(샤밧 하가돌의 「엘리야를 보내리니」),
// 호세아 14:2→**14:1**(샤밧 슈바), 열왕기하 12:1→**11:21**·12:17→**12:16**
// (셰칼림), 예레미야 9:23→**9:24**(티샤 베아브).
//
// 쓰는 법: node scripts/build-festival-readings.mjs

import fs from 'node:fs';
import path from 'node:path';

import { HebrewCalendar } from '@hebcal/core';
import { getLeyningForHoliday } from '@hebcal/leyning';

const FROM = 2015;
const TO = 2045;
const IN_ISRAEL = false;

const OUT = path.join(process.cwd(), 'src', 'data', 'festival-readings.json');

const BOOK_ID = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Joshua: 6, Judges: 7, Ruth: 8, 'I Samuel': 9, 'II Samuel': 10, 'I Kings': 11, 'II Kings': 12,
  Isaiah: 23, Jeremiah: 24, Lamentations: 25, Ezekiel: 26, Hosea: 28, Joel: 29, Amos: 30,
  Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34, Habakkuk: 35, Zephaniah: 36, Haggai: 37,
  Zechariah: 38, Malachi: 39, Esther: 17, Ecclesiastes: 21, 'Song of Songs': 22,
};

/** 히브리어 번호 → 개역개정 번호. 여기 없는 절은 두 성경이 같다. */
const FIXES = {
  'Isaiah 9:5': [9, 6], 'Isaiah 9:6': [9, 7],
  'I Kings 5:26': [5, 12],
  'II Kings 12:1': [11, 21], 'II Kings 12:17': [12, 16],
  'Hosea 2:1': [1, 10], 'Hosea 2:22': [2, 20],
  'Hosea 12:12': [12, 11], 'Hosea 12:13': [12, 12],
  'Hosea 14:2': [14, 1], 'Hosea 14:10': [14, 9],
  'Jeremiah 9:22': [9, 23], 'Jeremiah 9:23': [9, 24],
  'Zechariah 2:14': [2, 10],
  'Micah 5:6': [5, 7],
  'Malachi 3:19': [4, 1], 'Malachi 3:24': [4, 6],
};

/**
 * 절기 독서 이름 → 한글.
 *
 * **빠진 이름이 있으면 스크립트가 선다.** 영어 이름이 화면에 그대로 나가느니
 * 만들다 서는 편이 낫다.
 */
const KO = {
  'Rosh Hashana I': '나팔절 첫날 (로쉬 하샤나)',
  'Rosh Hashana I (on Shabbat)': '나팔절 첫날 (로쉬 하샤나)',
  'Rosh Hashana II': '나팔절 둘째 날',
  'Shabbat Shuva': '샤밧 슈바 — 회개의 안식일',
  'Yom Kippur': '속죄일 (욤 키푸르)',
  'Yom Kippur (on Shabbat)': '속죄일 (욤 키푸르)',
  'Sukkot I': '초막절 첫날',
  'Sukkot I (on Shabbat)': '초막절 첫날',
  'Sukkot II': '초막절 둘째 날',
  'Sukkot Shabbat Chol ha-Moed': '초막절 중간 안식일',
  'Shmini Atzeret': '여덟째 날 성회',
  'Shmini Atzeret (on Shabbat)': '여덟째 날 성회',
  'Simchat Torah': '심핫 토라 — 토라를 다 읽은 날',
  'Shabbat Rosh Chodesh': '초하루 안식일',
  'Shabbat Rosh Chodesh Chanukah': '초하루와 겹친 수전절 안식일',
  'Chanukah Day 1 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 2 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 3 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 4 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 5 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 6 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 7 (on Shabbat)': '수전절 안식일',
  'Chanukah Day 8 (on Shabbat)': '수전절 여덟째 날 안식일',
  'Shabbat Shekalim': '샤밧 셰칼림 — 반 세겔의 안식일',
  'Shabbat Shekalim (on Rosh Chodesh)': '샤밧 셰칼림 (초하루와 겹침)',
  'Shabbat Zachor': '샤밧 자코르 — 아말렉을 기억하라',
  'Shabbat Parah': '샤밧 파라 — 붉은 암송아지',
  'Shabbat HaChodesh': '샤밧 하호데쉬 — 첫 달의 안식일',
  'Shabbat HaChodesh (on Rosh Chodesh)': '샤밧 하호데쉬 (초하루와 겹침)',
  'Shabbat HaGadol': '샤밧 하가돌 — 유월절 앞 큰 안식일',
  'Pesach I': '유월절 첫날',
  'Pesach I (on Shabbat)': '유월절 첫날',
  'Pesach II': '유월절 둘째 날',
  'Pesach Shabbat Chol ha-Moed': '유월절 중간 안식일',
  'Pesach VII': '유월절 일곱째 날',
  'Pesach VII (on Shabbat)': '유월절 일곱째 날',
  'Pesach VIII': '유월절 여덟째 날',
  'Pesach VIII (on Shabbat)': '유월절 여덟째 날',
  'Shavuot I': '칠칠절 첫날 (오순절)',
  'Shavuot II': '칠칠절 둘째 날',
  'Shavuot II (on Shabbat)': '칠칠절 둘째 날',
  "Tish'a B'Av": '금식일 — 성전이 무너진 날 (티샤 베아브)',
  "Yom HaAtzma'ut": '이스라엘 독립기념일',
};

function fix(bookEn, chapter, verse) {
  const hit = FIXES[`${bookEn} ${chapter}:${verse}`];
  return hit ? { chapter: hit[0], verse: hit[1] } : { chapter, verse };
}

/** "Exodus 12:21-51; Numbers 28:16-25" · "Joshua 3:5-7, 5:2-6:1, 6:27" 둘 다 온다. */
function parse(text) {
  const parts = [];
  let bookEn = null;
  for (const chunk of text.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
    const m = chunk.match(/^(?:((?:I{1,2}\s)?[A-Za-z][A-Za-z ]*?)\s)?(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!m) throw new Error(`못 읽는 범위: "${chunk}" (${text})`);
    if (m[1]) bookEn = m[1].trim();
    if (!bookEn) throw new Error(`책 이름이 없다: ${text}`);
    const book = BOOK_ID[bookEn];
    if (!book) throw new Error(`모르는 책: ${bookEn} (${text})`);

    const sc = Number(m[2]);
    const start = fix(bookEn, sc, Number(m[3]));
    const ec = m[4] ? Number(m[4]) : sc;
    const end = m[5] === undefined ? start : fix(bookEn, ec, Number(m[5]));
    parts.push({
      book,
      startChapter: start.chapter, startVerse: start.verse,
      endChapter: end.chapter, endVerse: end.verse,
    });
  }
  return parts;
}

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const readings = {};
const dates = {};
const missing = new Set();

for (let y = FROM; y <= TO; y++) {
  for (const ev of HebrewCalendar.calendar({ year: y, isHebrewYear: false, il: IN_ISRAEL })) {
    let r;
    try {
      r = getLeyningForHoliday(ev, IN_ISRAEL);
    } catch {
      continue;
    }
    if (!r?.haftara) continue;

    const key = r.name?.en ?? ev.getDesc();
    if (!KO[key]) { missing.add(key); continue; }

    if (!readings[key]) {
      readings[key] = {
        ko: KO[key],
        haftarah: parse(r.haftara),
        // 토라 독서가 있으면 그 날은 파라샤 대신 이것을 읽는다. 없으면
        // 파라샤는 그대로 읽고 하프타라만 바뀌는 「특별 안식일」이다.
        ...(r.summary ? { torah: parse(r.summary) } : {}),
      };
      if (r.sephardic && r.sephardic !== r.haftara) readings[key].sephardi = parse(r.sephardic);
    }
    // 같은 날에 둘이 겹치면(초하루 + 하누카 등) 먼저 온 것을 남긴다 — hebcal 이
    // 이미 겹친 경우의 이름을 따로 준다('Shabbat Rosh Chodesh Chanukah').
    const day = ymd(ev.getDate().greg());
    if (!dates[day]) dates[day] = key;
  }
}

if (missing.size) {
  throw new Error(`한글 이름이 없는 절기 독서: ${[...missing].join(', ')}`);
}

fs.writeFileSync(OUT, JSON.stringify({ readings, dates }, null, 1), 'utf8');
console.log(
  `절기 독서 ${Object.keys(readings).length}가지 · 날짜 ${Object.keys(dates).length}일 ` +
  `(${FROM}–${TO}) → ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)}KB)`,
);
console.log(`토라까지 바뀌는 것 ${Object.values(readings).filter((r) => r.torah).length}가지 · ` +
  `하프타라만 바뀌는 것 ${Object.values(readings).filter((r) => !r.torah).length}가지`);
