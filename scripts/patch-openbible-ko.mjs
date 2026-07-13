// One-off manual fixes for the handful of chapter-boundary / source-PDF-defect
// spots that scripts/parse-openbible-pdf.mjs could not resolve automatically.
// See conversation notes: 6 chapter-boundary blends (no terminal punctuation
// before the split point) + 1 source-PDF text-corruption spot (Job 1:21-22,
// where the PDF's extracted text repeats a garbled fragment hundreds of times
// instead of the real verse text). The Job fix borrows the existing 개역한글
// (ko_ko) wording for just those 2 verses since OpenBible's own text is
// unrecoverable there.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'bible-source-data', 'openbible_ko.json');

const data = JSON.parse(readFileSync(FILE, 'utf-8'));
function book(abbrev) {
  const b = data.find((x) => x.abbrev === abbrev);
  if (!b) throw new Error(`book not found: ${abbrev}`);
  return b;
}
function setVerse(abbrev, chapter, verse, text) {
  book(abbrev).chapters[chapter - 1][verse - 1] = text;
}

// Psalm 2:12 is two sentences ("Kiss the Son..." + "Blessed are all they that
// put their trust in him"); the chapter-boundary sentence-split heuristic
// only consumes the first sentence, leaving the second stuck onto Psalm 3's
// superscription instead.
setVerse(
  'ps',
  2,
  12,
  '아들에게 입맞추라, 그렇지 않으면 그가 노하사 너희가 길에서 망하리니, 그의 진노가 급히 타오를 수 있음이라. 그에게 피하는 모든 자는 복이 있도다.'
);
setVerse('ps', 3, 1, '다윗이 그의 아들 압살롬을 피할 때 지은 시. 여호와여, 나의 대적들이 어찌 그리 많아졌는지요! 많은 사람들이 나를 대적하여 일어납니다.');

setVerse('lv', 2, 16, '제사장은 그 껍질 벗긴 곡식과 기름과 모든 유향을 기념물로 불사르라 이는 여호와께 드리는 화제니라.');
setVerse('lv', 3, 1, '‘만일 그의 예물이 화목 제사로 소의 경우에는, 수컷이든 암컷이든 흠 없는 것으로 여호와 앞에 드릴지니라.');

setVerse(
  'et',
  6,
  14,
  '그들이 아직 하만과 말하는 중에 왕의 내시들이 이르러 하만을 데리고 에스더가 베푼 잔치에 속히 나아가니라.'
);
setVerse('et', 7, 1, '왕과 하만이 에스더 왕후와 함께 포도주를 마시러 갔다.');

setVerse('ps', 121, 8, '여호와께서 너의 출입을 지키시리니 지금부터 영원까지 하시리로다.');
setVerse(
  'ps',
  122,
  1,
  '다윗의 성전에 올라가는 노래. 사람들이 내게 말하기를 “주님의 집으로 가자” 할 때에 내가 기뻐하였도다.'
);

setVerse('jo', 7, 53, '[그리고 각자는 자기 집으로 돌아갔다.]');
setVerse(
  'jo',
  8,
  1,
  '[초기 사본 중 일부는 요한복음 8:1 - 8:11을 이 위치에 포함하지 않지만 포함하고 있습니다.] 예수께서 감람산으로 가셨다.'
);

// Job 1:21-22: the source PDF's extracted text is corrupted here (a garbled
// fragment repeats hundreds of times instead of the real verse text).
// OpenBible's own wording is unrecoverable, so this borrows 개역한글's
// wording for just these 2 verses as a documented fallback.
setVerse(
  'job',
  1,
  21,
  '내가 모태에서 알몸으로 나왔사온즉 또한 알몸이 그리로 돌아가리라. 주신 이도 여호와시요 취하신 이도 여호와시니, 여호와의 이름이 찬송을 받으실지니이다.'
);
setVerse('job', 1, 22, '이 모든 일에 욥이 범죄하지 아니하고 하나님을 향하여 어리석게 원망하지 아니하니라.');

// A stray footer digit ("10") landed mid-sentence here with no leading
// newline before it, so the general page-noise stripping couldn't catch it.
setVerse('job', 11, 4, '너는 ‘내 교훈은 순수하다, 나는 주님의 눈에 깨끗하다’ 고 주장한다.');

// Revelation 13:18 is two sentences ("Here is wisdom." + "Let him that hath
// understanding count the number of the beast..."); same multi-sentence
// last-verse issue as Psalm 2:12 above — the split heuristic only consumes
// the first sentence, leaving the rest stuck onto Revelation 14:1.
setVerse('re', 13, 18, '여기에 지혜가 있습니다. 총명한 자는 그 짐승의 숫자를 세어 보라. 그것은 사람의 숫자입니다. 그 숫자는 666입니다.');
setVerse('re', 14, 1, '또 내가 보니, 어린 양이 시온 산에 서 있고, 그와 함께 144,000명이 있었는데, 그들의 이마에는 어린 양의 이름과 그 아버지의 이름이 기록되어 있더라.');

writeFileSync(FILE, JSON.stringify(data));
console.log('Patched', FILE);
