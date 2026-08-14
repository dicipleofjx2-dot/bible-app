import { forwardRef, useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// 만나주석 entries only ever use this small, known set of tags (<b>, <i>,
// <br>, <font color="#...">), authored by hand rather than generated from
// arbitrary markup — so a small regex tokenizer is enough, and far lighter
// than pulling in a full HTML parser/WebView for one limited tag subset.
type StyleFrame = { bold?: boolean; italic?: boolean; color?: string };
type Segment = { text: string; style: StyleFrame };

export type CommentaryHighlightRange = { start: number; end: number; color: string };

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tokenizeCommentaryHtml(html: string): Segment[] {
  const tokens = html.split(/(<br\s*\/?>|<\/?b>|<\/?i>|<font[^>]*>|<\/font>)/gi);
  const stack: StyleFrame[] = [{}];
  const segments: Segment[] = [];

  for (const token of tokens) {
    if (!token) continue;
    if (/^<br\s*\/?>$/i.test(token)) {
      segments.push({ text: '\n', style: stack[stack.length - 1] });
    } else if (/^<b>$/i.test(token)) {
      stack.push({ ...stack[stack.length - 1], bold: true });
    } else if (/^<\/b>$/i.test(token)) {
      if (stack.length > 1) stack.pop();
    } else if (/^<i>$/i.test(token)) {
      stack.push({ ...stack[stack.length - 1], italic: true });
    } else if (/^<\/i>$/i.test(token)) {
      if (stack.length > 1) stack.pop();
    } else if (/^<font/i.test(token)) {
      const match = token.match(/color=["']?(#[0-9a-fA-F]{3,6})["']?/i);
      stack.push({ ...stack[stack.length - 1], color: match?.[1] });
    } else if (/^<\/font>$/i.test(token)) {
      if (stack.length > 1) stack.pop();
    } else {
      segments.push({ text: decodeEntities(token), style: stack[stack.length - 1] });
    }
  }
  return segments;
}

/** Plain rendered text for a commentary HTML body — the coordinate space
 * that highlight start/end offsets are measured in. Must stay derived from
 * the same tokenizer used for rendering so offsets always line up. */
export function commentaryPlainText(html: string): string {
  return tokenizeCommentaryHtml(html)
    .map((s) => s.text)
    .join('');
}

function renderSegments(
  segments: Segment[],
  highlights: CommentaryHighlightRange[],
  baseColor: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  let offset = 0;
  let key = 0;

  for (const seg of segments) {
    const segStart = offset;
    const segEnd = offset + seg.text.length;
    const breakpoints = new Set<number>([segStart, segEnd]);
    for (const h of sorted) {
      if (h.start > segStart && h.start < segEnd) breakpoints.add(h.start);
      if (h.end > segStart && h.end < segEnd) breakpoints.add(h.end);
    }
    const points = Array.from(breakpoints).sort((a, b) => a - b);

    for (let i = 0; i < points.length - 1; i++) {
      const sliceStart = points[i];
      const sliceEnd = points[i + 1];
      if (sliceStart === sliceEnd) continue;
      const sliceText = seg.text.slice(sliceStart - segStart, sliceEnd - segStart);
      const hit = sorted.find((h) => sliceStart >= h.start && sliceStart < h.end);
      nodes.push(
        <Text
          key={key++}
          style={{
            fontWeight: seg.style.bold ? '700' : '400',
            fontStyle: seg.style.italic ? 'italic' : 'normal',
            color: seg.style.color ?? baseColor,
            backgroundColor: hit?.color,
          }}>
          {sliceText}
        </Text>
      );
    }
    offset = segEnd;
  }
  return nodes;
}

type CommentaryTextProps = {
  html: string;
  highlights?: CommentaryHighlightRange[];
  style?: StyleProp<TextStyle>;
};

export const CommentaryText = forwardRef<Text, CommentaryTextProps>(function CommentaryText(
  { html, highlights = [], style },
  ref
) {
  const theme = useTheme();
  const segments = useMemo(() => tokenizeCommentaryHtml(html), [html]);

  return (
    <Text ref={ref} selectable style={[{ color: theme.text, fontSize: 15, lineHeight: 24 }, style]}>
      {renderSegments(segments, highlights, theme.text)}
    </Text>
  );
});
