import { Platform } from 'react-native';

import { BIBLE_BOOKS, BIBLE_BOOKS_BY_NAME_LENGTH } from './bibleBooks';
import { fetchJsonp } from './jsonp';
import type { PlanChapterEntry, PlanDay } from './readingPlan';

const FEED_BASE_URL = 'https://biblereadinghelper.blogspot.com/feeds/posts/default';

export type BlogPost = {
  title: string;
  publishedAt: string;
  html: string;
  bookName: string | null;
  startChapter: number | null;
  endChapter: number | null;
};

type RawEntry = {
  title?: { $t?: string };
  published?: { $t?: string };
  content?: { $t?: string };
};

/** Finds a book name + chapter range like "창세기 1~5장" / "창세기 6장~8장" /
 * "창세기 9-11장" anywhere in the title. Returns null if no range is found. */
function parseRange(title: string): { bookName: string; start: number; end: number } | null {
  const book = BIBLE_BOOKS_BY_NAME_LENGTH.find((b) => title.includes(b.name));
  if (!book) return null;

  const idx = title.indexOf(book.name);
  const rest = title.slice(idx + book.name.length);
  const match = rest.match(/\s*(\d+)\s*장?\s*[~\-]\s*(\d+)\s*장/) ?? rest.match(/\s*(\d+)\s*장/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  return { bookName: book.name, start, end };
}

/** Strips HTML tags/entities down to plain, readable text for the summary card. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let cache: Promise<BlogPost[]> | null = null;

async function fetchPosts(): Promise<BlogPost[]> {
  let json: { feed?: { entry?: RawEntry[] } };
  if (Platform.OS === 'web') {
    // Blogger doesn't send CORS headers on this endpoint, so a plain
    // fetch()/XHR read is blocked by the browser (native has no such
    // restriction — CORS is browser-only, so fetch() there is fine as-is).
    // Blogger's classic GData API still supports JSONP (a <script> load,
    // which isn't subject to CORS at all), so use that on web instead.
    json = (await fetchJsonp(`${FEED_BASE_URL}?alt=json-in-script&max-results=500`)) as typeof json;
  } else {
    const res = await fetch(`${FEED_BASE_URL}?alt=json&max-results=500`);
    if (!res.ok) throw new Error(`블로그를 불러오지 못했습니다 (${res.status})`);
    json = await res.json();
  }
  const entries: RawEntry[] = json?.feed?.entry ?? [];

  return entries.map((entry) => {
    const title = entry.title?.$t ?? '';
    const range = parseRange(title);
    return {
      title,
      publishedAt: entry.published?.$t ?? '',
      html: entry.content?.$t ?? '',
      bookName: range?.bookName ?? null,
      startChapter: range?.start ?? null,
      endChapter: range?.end ?? null,
    };
  });
}

/** Fetches all posts, oldest first (so post order lines up with Day 1, 2, 3...). */
export async function getBlogPosts(): Promise<BlogPost[]> {
  if (!cache) cache = fetchPosts();
  const posts = await cache;
  return [...posts].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}

export type BlogPlanDay = {
  dayNumber: number;
  chapters: PlanChapterEntry[];
  post: BlogPost;
};

/** The reading plan's real source of truth: each blog post *is* one day's
 * assignment, in publish order (oldest = Day 1). This is deliberately not
 * derived from the calendar/3-per-weekday-5-per-Sunday formula in
 * readingPlan.ts — that formula can't know what the blog actually covers on
 * a given day (posts don't land on a fixed cadence), so quiz/memorization
 * content authored against a specific chapter range would drift out of sync
 * with what's displayed. Days beyond what's been published here simply
 * don't exist yet — callers should fall back to the calendar-only plan for
 * those and show a "not ready yet" state. */
export async function getBlogPlanDays(): Promise<BlogPlanDay[]> {
  const posts = await getBlogPosts();
  const withRange = posts.filter(
    (p): p is BlogPost & { bookName: string; startChapter: number; endChapter: number } =>
      p.bookName !== null && p.startChapter !== null && p.endChapter !== null
  );
  return withRange.map((post, i) => {
    const book = BIBLE_BOOKS.find((b) => b.name === post.bookName);
    const chapters: PlanChapterEntry[] = [];
    if (book) {
      for (let c = post.startChapter; c <= post.endChapter; c++) {
        chapters.push({ bookId: book.id, bookName: book.name, chapter: c });
      }
    }
    return { dayNumber: i + 1, chapters, post };
  });
}

/** Overrides each day's chapters with the matching blog post's real range
 * where the blog has published that far (see getBlogPlanDays) — any screen
 * that displays a day's reading range from the calendar-only algoPlan
 * (buildFullPlan) must run it through this first, or it'll show the
 * formula's guess instead of what's actually assigned. Days beyond the
 * blog's current post count keep the algoPlan's chapters unchanged. */
export async function mergeWithBlogChapters(algoPlan: PlanDay[]): Promise<PlanDay[]> {
  const blogDays = await getBlogPlanDays();
  return algoPlan.map((day) => {
    const blogDay = blogDays[day.dayNumber - 1];
    return blogDay ? { ...day, chapters: blogDay.chapters } : day;
  });
}
