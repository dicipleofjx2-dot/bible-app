// Builds assets/bible-data/bible.db from the source JSON bibles in
// scripts/bible-source-data/. Run with: node scripts/build-bible-db.mjs
//
// Source data: thiagobodruk/bible (https://github.com/thiagobodruk/bible), CC BY-NC.
// ko_ko.json = 개역한글 (Korean Revised Version, 1961), en_kjv.json = King James Version.
// NOTE: CC BY-NC means this bundled data is for non-commercial use only. If this
// app is ever monetized, swap in a permissively-licensed dataset here.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'bible-source-data');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'bible-data');
const OUT_FILE = path.join(OUT_DIR, 'bible.db');

const TRANSLATIONS = [
  { code: 'ko_ko', file: 'ko_ko.json', lang: 'ko' },
  { code: 'en_kjv', file: 'en_kjv.json', lang: 'en' },
];

// The source ko_ko.json's "name" field is left in English (only verse text is
// translated), so book titles are mapped by hand here, in canonical order.
const KOREAN_BOOK_NAMES = [
  '창세기', '출애굽기', '레위기', '민수기', '신명기', '여호수아', '사사기', '룻기',
  '사무엘상', '사무엘하', '열왕기상', '열왕기하', '역대상', '역대하', '에스라', '느헤미야',
  '에스더', '욥기', '시편', '잠언', '전도서', '아가', '이사야', '예레미야',
  '예레미야애가', '에스겔', '다니엘', '호세아', '요엘', '아모스', '오바댜', '요나',
  '미가', '나훔', '하박국', '스바냐', '학개', '스가랴', '말라기',
  '마태복음', '마가복음', '누가복음', '요한복음', '사도행전', '로마서', '고린도전서', '고린도후서',
  '갈라디아서', '에베소서', '빌립보서', '골로새서', '데살로니가전서', '데살로니가후서',
  '디모데전서', '디모데후서', '디도서', '빌레몬서', '히브리서', '야고보서',
  '베드로전서', '베드로후서', '요한일서', '요한이서', '요한삼서', '유다서', '요한계시록',
];

function loadJson(file) {
  const raw = readFileSync(path.join(SRC_DIR, file), 'utf-8').replace(/^﻿/, '');
  return JSON.parse(raw);
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY,
      abbrev TEXT NOT NULL,
      name_ko TEXT NOT NULL,
      name_en TEXT NOT NULL,
      testament TEXT NOT NULL,
      book_order INTEGER NOT NULL
    );

    CREATE TABLE verses (
      id INTEGER PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES books(id),
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      translation TEXT NOT NULL,
      text TEXT NOT NULL
    );

    CREATE INDEX idx_verses_lookup ON verses(translation, book_id, chapter, verse);
  `);
  // Note: the FTS5 index is NOT built here because sql.js's default WASM build
  // has no fts5 module. It is built on-device at runtime instead (see
  // src/db/bible.ts), using the FTS5-enabled sqlite that ships with expo-sqlite.

  const koData = loadJson('ko_ko.json');
  const enData = loadJson('en_kjv.json');

  if (koData.length !== enData.length) {
    throw new Error('Korean and English source data have different book counts');
  }
  if (koData.length !== KOREAN_BOOK_NAMES.length) {
    throw new Error(
      `KOREAN_BOOK_NAMES has ${KOREAN_BOOK_NAMES.length} entries, expected ${koData.length}`
    );
  }

  const insertBook = db.prepare(
    `INSERT INTO books (id, abbrev, name_ko, name_en, testament, book_order) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertVerse = db.prepare(
    `INSERT INTO verses (book_id, chapter, verse, translation, text) VALUES (?, ?, ?, ?, ?)`
  );

  koData.forEach((koBook, bookIndex) => {
    const enBook = enData[bookIndex];
    const bookId = bookIndex + 1;
    const testament = bookIndex < 39 ? 'OT' : 'NT';

    insertBook.run([bookId, koBook.abbrev, KOREAN_BOOK_NAMES[bookIndex], enBook.name, testament, bookId]);

    for (const [translationCode, book] of [
      ['ko_ko', koBook],
      ['en_kjv', enBook],
    ]) {
      book.chapters.forEach((chapterVerses, chapterIndex) => {
        chapterVerses.forEach((text, verseIndex) => {
          insertVerse.run([bookId, chapterIndex + 1, verseIndex + 1, translationCode, text]);
        });
      });
    }
  });

  insertBook.free();
  insertVerse.free();

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const data = db.export();
  writeFileSync(OUT_FILE, Buffer.from(data));

  const [{ count }] = db.exec('SELECT COUNT(*) as count FROM verses')[0].values.map(([count]) => ({ count }));
  console.log(`Built ${OUT_FILE}`);
  console.log(`Books: ${koData.length}, Verses (both translations): ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
