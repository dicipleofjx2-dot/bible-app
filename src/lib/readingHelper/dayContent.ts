import { getBlogPlanDays } from './blogContent';
import { parseBlogPostContent } from './blogQuizParser';
import type { DayQuizContent } from './quizTypes';

const cache = new Map<number, DayQuizContent | null>();

/** A day's quiz/memorization/narrative content, parsed live from the blog
 * post that IS that day's reading assignment (see getBlogPlanDays — post
 * order = day order). Returns null if the blog hasn't published that far
 * yet, or if a post doesn't have the expected sections. */
export async function getDayContent(dayNumber: number): Promise<DayQuizContent | null> {
  if (cache.has(dayNumber)) return cache.get(dayNumber)!;

  const blogDays = await getBlogPlanDays();
  const blogDay = blogDays[dayNumber - 1];
  const content = blogDay ? parseBlogPostContent(dayNumber, blogDay.post.html) : null;

  cache.set(dayNumber, content);
  return content;
}
