// Parses the OpenBible PDF sources (scripts/bible-source-data/OpenBible.ko-KR.pdf,
// OpenBible.en-GB.pdf) into the same {abbrev, chapters:[[verse,...]]} JSON shape
// used by ko_ko.json/en_kjv.json, so build-bible-db.mjs can bundle them as
// ordinary translations.
//
// The PDF text has no inline chapter-number marker and no marker for a
// chapter's verse 1 (only verses 2+ are numbered). Chapter boundaries are
// therefore detected by the verse-number sequence resetting to 2, and the
// text spanning "last verse of chapter N" + "verse 1 of chapter N+1" (which
// has no delimiter between them) is split heuristically at the nearest
// sentence-ending punctuation.
//
// Usage: node scripts/parse-openbible-pdf.mjs <pdf-path> <out-json-path> <book-names-json-path>

import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'bible-source-data');

function loadJson(file) {
  const raw = readFileSync(path.join(SRC_DIR, file), 'utf-8').replace(/^﻿/, '');
  return JSON.parse(raw);
}

// Strips pdf-parse's inserted page-break markers ("-- N of TOTAL --") along
// with the stray footer digit line(s) (page/chapter index footers) that
// immediately precede them.
function stripPageNoise(rawText) {
  // The source PDF has a genuine text-corruption defect at Job 1:21 (a
  // garbled fragment repeats ~3800 times across several pages instead of the
  // real verse text — see scripts/patch-openbible-ko.mjs, which overwrites
  // Job 1:21-22 by hand regardless). Collapsing the whole span here first
  // keeps that already-unrecoverable garbage, and the page-break markers
  // embedded inside it, from confusing the page-break regexes below and
  // corrupting unrelated later chapters. Anchored to the exact phrase right
  // before the corruption starts and right after it ends (Job 2:1's real
  // opening), so this can't accidentally match anything else.
  const text = rawText.replace(
    /(주신 이도 )(?:주시니도[\s\S]*?)(또 다른 날에)/,
    '$1여호와시요 취하신 이도 여호와시니, 여호와의 이름이 찬송을 받으실지니이다. 22 이 모든 일에 욥이 범죄하지 아니하니라.\n$2'
  );

  // The footer between real content and the marker is always a run of
  // nothing but stray digits and whitespace — sometimes several digits on
  // one line separated by a tab, sometimes each on its own line, sometimes
  // 1, sometimes 3+. Real prose never consists purely of bare digits and
  // whitespace, so matching that whole run (however it's laid out) is safe.
  const withFooters = text.replace(/\n[ \t\d\n]*\d[ \t\n]*-- \d+ of \d+ --\n+/g, '\n');
  // Some page breaks have zero stray footer digits (the page ends exactly on
  // a sentence boundary) — those need >=2 newlines (a real blank-line
  // paragraph gap) before the marker, so a genuine single verse-final digit
  // is never mistaken for footer noise.
  const withBlankBreaks = withFooters.replace(/\n{2,}-- \d+ of \d+ --\n+/g, '\n');
  // The very last page break in the document has no following content, so it
  // doesn't match the trailing "\n+" above; strip it here instead, anchored
  // to end-of-string so this can't touch anything mid-document.
  return withBlankBreaks.replace(/\n+-- \d+ of \d+ --\n*$/, '\n');
}

// Finds the start index of every book heading (an exact, trimmed, standalone
// line) in canonical order, returning [{ name, start, headingEnd }, ...].
function findBookBoundaries(text, bookNames) {
  const boundaries = [];
  let cursor = 0;
  for (const name of bookNames) {
    const re = new RegExp(`^[ \\t]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*$`, 'm');
    const searchText = text.slice(cursor);
    const m = re.exec(searchText);
    if (!m) throw new Error(`Book heading not found: "${name}" (searching from ${cursor})`);
    const start = cursor + m.index;
    const headingEnd = start + m[0].length;
    boundaries.push({ name, start, headingEnd });
    cursor = headingEnd;
  }
  return boundaries;
}

// Finds all whitespace/punctuation-bounded numeric tokens (candidate verse
// markers). Numbers fused directly to Hangul/Latin letters (e.g. "930년",
// "105세") are excluded since real verse markers always have a space/newline
// on both sides.
function findCandidateMarkers(segment) {
  // Comma-grouped numbers (e.g. "24,000") are never verse markers (real verse
  // numbers are always small and unadorned). Mask their character ranges out
  // first so the leading digits before a thousands-separator comma never get
  // mistaken for a standalone marker, regardless of what follows them.
  const excluded = [];
  const groupRe = /\d{1,3}(?:,\d{3})+/g;
  let gm;
  while ((gm = groupRe.exec(segment))) {
    excluded.push([gm.index, gm.index + gm[0].length]);
  }
  const isExcluded = (start) => excluded.some(([s, e]) => start >= s && start < e);

  const candidates = [];
  const re = /(?:^|[\s"'“”‘’(])(\d+)(?=[\s"'“”‘’.,;:!?)]|$)/g;
  let m;
  while ((m = re.exec(segment))) {
    const start = m.index + m[0].length - m[1].length;
    if (isExcluded(start)) continue;
    candidates.push({ start, end: m.index + m[0].length, value: Number(m[1]) });
  }
  return candidates;
}

// Generous enough that even long verses (Esther 8:9, etc.) never trip it,
// but short enough to catch "swallowed several chapters" cases.
const MAX_VERSE_SPAN = 1200;

function nextMarkerWithValue(candidates, fromIdx, expectedValue, lookahead = 40) {
  for (let i = fromIdx; i < candidates.length && i < fromIdx + lookahead; i++) {
    if (candidates[i].value === expectedValue) return { ...candidates[i], idx: i };
  }
  return null;
}

// Splits a blob containing [last verse of chapter N][first verse of chapter
// N+1] at a sentence-ending punctuation mark. Narrative verses very commonly
// end with a reporting clause ("...said,") immediately followed by a quote
// that is itself part of the SAME verse (e.g. "리브가가 이삭에게 말하였다.
// '헷 사람의 딸들 때문에...'"). Naively splitting at the first period would
// cut the verse off before the quote and hand the whole quote to the next
// chapter's verse 1 instead. So: track quote nesting depth, only consider a
// split candidate valid outside any open quote, AND reject a candidate if
// what immediately follows is an opening quote (that quote belongs to the
// same verse) — keep scanning past it to the next candidate instead.
// Straight quote characters (" ') are ambiguous — the same glyph opens and
// closes — so they can't drive nesting depth (that would only ever
// increment). Only the unambiguous curly quotes are used for depth
// tracking; straight quotes are still treated as "quote-like" for the
// simpler "don't split right before a quote" check below.
const CURLY_OPEN = '“‘';
const CURLY_CLOSE = '”’';
const ANY_QUOTE = '"\'“‘';
// A short clause ("...말하였다.") immediately followed by a quote is almost
// certainly a reporting verb whose quote is part of the SAME verse. A full,
// normal-length sentence followed by a quote is just as likely to be the
// previous verse ending normally with a new chapter's dialogue starting
// right after — that candidate should NOT be rejected. Length is the
// deciding signal since there's no reliable syntactic marker otherwise.
const REPORTING_CLAUSE_MAX_LENGTH = 20;
function splitBlobBySentence(blob) {
  const re = /[.!?][”’"')]*(?:\s|$)/g;
  const candidates = [];
  let m;
  while ((m = re.exec(blob))) {
    const splitAt = m.index + m[0].length;
    let depth = 0;
    for (const ch of blob.slice(0, splitAt)) {
      if (CURLY_OPEN.includes(ch)) depth++;
      else if (CURLY_CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    }
    candidates.push({ index: m.index, splitAt, depth });
  }
  if (candidates.length === 0) return [blob.trim(), ''];

  // Prefer, in order: (1) depth 0 and not a short reporting clause right
  // before a quote, (2) depth 0 (ignoring the reporting-clause heuristic),
  // (3) any candidate at all — e.g. some translations open a quote at the
  // start of an extended discourse without ever closing it, which would
  // otherwise leave depth permanently >0 for the rest of the book and
  // starve every later chapter boundary of a valid split point.
  let clauseStart = 0;
  for (const c of candidates) {
    if (c.depth > 0) continue;
    const next = blob.slice(c.splitAt).trimStart()[0];
    const clauseLength = c.index - clauseStart;
    if (next && ANY_QUOTE.includes(next) && clauseLength <= REPORTING_CLAUSE_MAX_LENGTH) {
      clauseStart = c.splitAt;
      continue;
    }
    return [blob.slice(0, c.splitAt).trim(), blob.slice(c.splitAt).trim()];
  }
  const depthZero = candidates.find((c) => c.depth === 0);
  const fallback = depthZero ?? candidates[0];
  return [blob.slice(0, fallback.splitAt).trim(), blob.slice(fallback.splitAt).trim()];
}

function cleanVerseText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Psalms is the one book where a chapter with a superscription (title, e.g.
// "다윗의 시.") explicitly marks verse 1 with "1" (to set it apart from the
// unnumbered title) instead of leaving it unmarked like every other book.
function parseBook(segment, bookName, versesPerChapter, { allowVerse1Marker = false } = {}) {
  const candidates = findCandidateMarkers(segment);
  const numChapters = versesPerChapter.length;
  const allVerses = [];
  let cursor = 0;
  let ci = 0;
  const warnings = [];
  const failedChapters = [];

  for (let c = 0; c < numChapters; c++) {
    const V = versesPerChapter[c];
    const verses = new Array(V).fill(null);

    const m2 = nextMarkerWithValue(candidates, ci, 2);
    if (!m2) {
      warnings.push(`${bookName} ch${c + 1}: could not find marker "2"`);
      failedChapters.push(c);
      if (process.env.DEBUG_BLOB) {
        console.error(`--- context for ${bookName} ch${c + 1} marker "2" (cursor=${cursor}, ci=${ci}) ---`);
        console.error(JSON.stringify(segment.slice(cursor, cursor + 400)));
        console.error('next candidates:', candidates.slice(ci, ci + 10));
      }
      break;
    }

    // Only look for a "1" strictly between the previous chapter's last real
    // marker and this chapter's own "2" — never further ahead, so a
    // titleless chapter can never accidentally match some unrelated "1"
    // deep inside a later chapter.
    let m1 = null;
    if (allowVerse1Marker) {
      for (let i = ci; i < m2.idx; i++) {
        if (candidates[i].value === 1) {
          m1 = { ...candidates[i], idx: i };
          break;
        }
      }
    }
    const hasSuperscription = m1 !== null;

    if (c === 0 && !hasSuperscription) {
      verses[0] = cleanVerseText(segment.slice(cursor, m2.start));
    } else if (hasSuperscription) {
      // rawBeforeM1 = [previous chapter's true last verse] + [this
      // chapter's superscription], blended with no delimiter between them.
      const rawBeforeM1 = segment.slice(cursor, m1.start);
      let superscription = rawBeforeM1;
      if (c > 0) {
        const [lastOfPrev, titleText] = splitBlobBySentence(rawBeforeM1);
        allVerses[c - 1][allVerses[c - 1].length - 1] = cleanVerseText(lastOfPrev);
        superscription = titleText;
      }
      const afterM1 = segment.slice(m1.end, m2.start);
      verses[0] = cleanVerseText(`${superscription} ${afterM1}`);
    } else {
      const rawBeforeM2 = segment.slice(cursor, m2.start);
      const [lastOfPrev, firstOfThis] = splitBlobBySentence(rawBeforeM2);
      const prevVerses = allVerses[c - 1];
      prevVerses[prevVerses.length - 1] = cleanVerseText(lastOfPrev);
      verses[0] = cleanVerseText(firstOfThis);
    }
    cursor = m2.end;
    ci = m2.idx + 1;

    let chapterFailed = false;
    let consecutiveMissing = 0;
    for (let v = 3; v <= V; v++) {
      const m = nextMarkerWithValue(candidates, ci, v);
      // A source PDF can genuinely drop a verse's marker entirely (e.g. this
      // English PDF is missing Judges 13:11 outright — v10 jumps straight to
      // v12). When that happens, searching for the missing value finds the
      // NEXT chapter's own marker of the same number instead — a "valid"
      // match that silently swallows everything in between. A verse
      // spanning this much text is implausible, so treat an overlong span
      // the same as "marker not found": leave this one verse empty (for
      // manual review) and keep searching for the NEXT value from the SAME
      // position, since v+1's own real marker is usually right there.
      const span = m ? m.start - cursor : 0;
      if (!m || span > MAX_VERSE_SPAN) {
        warnings.push(
          m
            ? `${bookName} ch${c + 1}: marker "${v}" only found ${span} chars away (likely a missing verse) — leaving empty`
            : `${bookName} ch${c + 1}: could not find marker "${v}" — leaving empty`
        );
        consecutiveMissing++;
        // Several in a row means the chapter has genuinely desynced (not
        // just one dropped verse) — give up rather than flag every
        // remaining verse individually.
        if (consecutiveMissing > 3) {
          failedChapters.push(c);
          chapterFailed = true;
          break;
        }
        continue;
      }
      consecutiveMissing = 0;
      verses[v - 2] = cleanVerseText(segment.slice(cursor, m.start));
      cursor = m.end;
      ci = m.idx + 1;
    }

    allVerses.push(verses);
    if (chapterFailed) break;
  }

  // Last verse of the last chapter runs to the end of the book's segment.
  const lastChapter = allVerses[allVerses.length - 1];
  if (lastChapter) {
    lastChapter[lastChapter.length - 1] = cleanVerseText(segment.slice(cursor));
  }

  return { verses: allVerses, warnings, failedChapters };
}

async function main() {
  const [, , pdfPath, outPath, bookNamesPath] = process.argv;
  if (!pdfPath || !outPath || !bookNamesPath) {
    console.error('Usage: node scripts/parse-openbible-pdf.mjs <pdf-path> <out-json-path> <book-names-json-path>');
    process.exit(1);
  }

  const bookNames = JSON.parse(readFileSync(bookNamesPath, 'utf-8'));
  const koData = loadJson('ko_ko.json'); // canonical abbrev + book/chapter structure
  const enData = loadJson('en_kjv.json');
  if (bookNames.length !== koData.length) {
    throw new Error(`bookNames has ${bookNames.length} entries, expected ${koData.length}`);
  }
  // ko_ko.json (thiagobodruk/bible) has real data gaps — 56 chapters are
  // missing trailing verses present in en_kjv.json, and vice versa in a
  // handful of others (e.g. ps118 has only 9 of its 29 verses in ko_ko).
  // Taking the max of the two per chapter recovers the true standard verse
  // count in every case checked, since the gap is always missing tail
  // verses rather than swapped/reordered content.
  const versesPerChapterByBook = koData.map((koBook, i) =>
    koBook.chapters.map((ch, ci) => Math.max(ch.length, enData[i].chapters[ci].length))
  );
  // Revelation 12 is the one confirmed case where the larger (en_kjv) count
  // is itself wrong (standard versification has 17 verses, not 18) — taking
  // the max there silently eats into Revelation 13's real text instead of
  // failing loudly, since ch13 coincidentally also reaches a marker "18".
  {
    const reIdx = koData.findIndex((b) => b.abbrev === 're');
    versesPerChapterByBook[reIdx][11] = 17;
  }

  console.log('Extracting PDF text...');
  const buf = readFileSync(pdfPath);
  const parser = new PDFParse({ data: buf });
  const data = await parser.getText();
  await parser.destroy();
  console.log(`Extracted ${data.total} pages, ${data.text.length} chars`);

  const cleaned = stripPageNoise(data.text);
  const boundaries = findBookBoundaries(cleaned, bookNames);

  const output = [];
  let totalWarnings = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const { name, headingEnd } = boundaries[i];
    const segmentEnd = i + 1 < boundaries.length ? boundaries[i + 1].start : cleaned.length;
    let segment = cleaned.slice(headingEnd, segmentEnd);
    // Strip repeated running-header occurrences of this book's own name.
    const headerRe = new RegExp(`^[ \\t]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*$`, 'gm');
    segment = segment.replace(headerRe, '');

    const versesPerChapter = versesPerChapterByBook[i];
    const minVersesPerChapter = koData[i].chapters.map((ch, ci2) => Math.min(ch.length, enData[i].chapters[ci2].length));

    let verses, warnings, failedChapters;
    for (let attempt = 0; attempt < 5; attempt++) {
      ({ verses, warnings, failedChapters } = parseBook(segment, name, versesPerChapter, {
        allowVerse1Marker: koData[i].abbrev === 'ps',
      }));
      if (failedChapters.length === 0) break;
      // A chapter expecting the max(ko, en) count couldn't find its last
      // marker — the OpenBible PDF follows the other tradition's (smaller)
      // versification for this chapter specifically. Fall back to the
      // smaller count for just that chapter and reparse the whole book.
      for (const c of failedChapters) versesPerChapter[c] = minVersesPerChapter[c];
    }

    for (const w of warnings) console.warn('WARNING:', w);
    totalWarnings += warnings.length;

    // Validate verse counts per chapter.
    verses.forEach((chVerses, ci2) => {
      const expected = versesPerChapter[ci2];
      const emptyCount = chVerses.filter((v) => !v).length;
      if (emptyCount > 0) {
        console.warn(`WARNING: ${name} ch${ci2 + 1}: ${emptyCount}/${expected} verses empty`);
        totalWarnings += emptyCount;
      }
    });

    output.push({ abbrev: koData[i].abbrev, chapters: verses });
  }

  writeFileSync(outPath, JSON.stringify(output));
  console.log(`Wrote ${outPath}`);
  console.log(`Total warnings: ${totalWarnings}`);

  // Broader sanity check independent of the ko/en verse-count comparison:
  // a verse whose text contains a whitespace-bounded standalone number is
  // almost certainly contaminated by a chapter-boundary drift (real prose
  // never contains a bare number like that — see findCandidateMarkers).
  // This catches silent mis-splits that don't otherwise throw a warning
  // (e.g. the Revelation 12/13 case, where a wrong-but-plausible marker was
  // found so no "could not find" warning fired).
  let suspiciousCount = 0;
  output.forEach((book) => {
    book.chapters.forEach((ch, ci2) => {
      ch.forEach((v, vi) => {
        if (v && findCandidateMarkers(v).length > 0) {
          suspiciousCount++;
          console.warn(`SUSPICIOUS: ${book.abbrev} ${ci2 + 1}:${vi + 1}: ${v.slice(0, 80)}`);
        }
      });
    });
  });
  console.log(`Suspicious (possible drift) verses: ${suspiciousCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
