// One-off manual fixes for the handful of spots scripts/parse-openbible-pdf.mjs
// could not resolve automatically in the English OpenBible PDF. Mirrors
// patch-openbible-ko.mjs's approach: chapter-boundary blends the split
// heuristic got wrong, versification-count artifacts where en_kjv.json's
// per-chapter verse count doesn't match the real content, and genuine
// content gaps in the source PDF (verse entirely absent) that borrow KJV
// wording as a documented fallback.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'bible-source-data', 'openbible_en.json');

const data = JSON.parse(readFileSync(FILE, 'utf-8'));
function book(abbrev) {
  const b = data.find((x) => x.abbrev === abbrev);
  if (!b) throw new Error(`book not found: ${abbrev}`);
  return b;
}
function setVerse(abbrev, chapter, verse, text) {
  book(abbrev).chapters[chapter - 1][verse - 1] = text;
}
function getVerse(abbrev, chapter, verse) {
  return book(abbrev).chapters[chapter - 1][verse - 1];
}

// Deuteronomy 31:30 ends with a colon introducing the Song of Moses, so the
// "first sentence-ending punctuation" heuristic (which only recognizes
// .!?) never finds a split point until the end of 32:1 itself, dumping both
// verses into 31:30 and leaving 32:1 empty.
setVerse(
  'dt',
  31,
  30,
  'And Moses recited the words of this song from start to finish in the hearing of the whole assembly of Israel:'
);
setVerse('dt', 32, 1, 'Listen, O heavens, and I will speak; let the earth hear the words of my mouth.');

// Judges 13:11's marker is missing from the source PDF entirely (v10 jumps
// straight to v12), so the parser's recovery left v10 empty and shifted
// v10's real text into the v11 slot. Move it back, and borrow KJV wording
// for v11 itself since OpenBible's own text for it is unrecoverable here.
setVerse('jud', 13, 10, getVerse('jud', 13, 11));
setVerse(
  'jud',
  13,
  11,
  'Manoah got up and followed his wife. He came to the man and asked, “Are you the one who spoke to my wife?” “I am,” he replied.'
);

// 1 Samuel 20: en_kjv.json splits what is really the start of 21:1 off as an
// extra "verse 43" of chapter 20, so the true v42 never gets its own marker
// here. The parser's recovery shifted v42's real text into the v43 slot.
setVerse('1sm', 20, 42, getVerse('1sm', 20, 43));
setVerse('1sm', 20, 43, 'So David got up and left, and Jonathan went back into the city.');

// 1 Kings 22: same pattern — en_kjv.json's inflated count (54 vs the
// standard 53) leaves the real v53 marker missing, shifting its text into
// the v54 slot.
setVerse('1kgs', 22, 53, getVerse('1kgs', 22, 54));
setVerse(
  '1kgs',
  22,
  54,
  'Ahaziah continued to serve Baal just as his father had, provoking the Lord, the God of Israel, to anger.'
);

// Isaiah 9:7 is missing from the source PDF entirely (v6 jumps straight to
// v8: "...Prince of Peace. 8 The Lord has sent..."), so the parser's
// recovery shifted v6's real text into the v7 slot. Move it back, then
// borrow KJV wording for v7 itself since OpenBible's own text for it is
// unrecoverable here.
setVerse('is', 9, 6, getVerse('is', 9, 7));
setVerse(
  'is',
  9,
  7,
  'Of the increase of his government and peace there will be no end, upon the throne of David and over his kingdom, to order it and establish it with judgment and justice from now on, even forever. The zeal of the Lord of hosts will perform this.'
);

setVerse('jo', 7, 53, '[And each one returned to his home.]');
setVerse(
  'jo',
  8,
  1,
  '[Some early manuscripts do not include John 8:1 - 8:11 at this location, but some do.] Jesus went to the Mount of Olives.'
);

writeFileSync(FILE, JSON.stringify(data));
console.log('Patched', FILE);
