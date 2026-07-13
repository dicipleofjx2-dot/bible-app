import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// 만나주석 entries only ever use this small, known set of tags (<b>, <i>,
// <br>, <font color="#...">), authored by hand rather than generated from
// arbitrary markup — so a small regex tokenizer is enough, and far lighter
// than pulling in a full HTML parser/WebView for one limited tag subset.
type StyleFrame = { bold?: boolean; italic?: boolean; color?: string };

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderCommentaryHtml(html: string, baseColor: string) {
  const tokens = html.split(/(<br\s*\/?>|<\/?b>|<\/?i>|<font[^>]*>|<\/font>)/gi);
  const stack: StyleFrame[] = [{}];
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const token of tokens) {
    if (!token) continue;
    if (/^<br\s*\/?>$/i.test(token)) {
      nodes.push('\n');
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
      const frame = stack[stack.length - 1];
      nodes.push(
        <Text
          key={key++}
          style={{
            fontWeight: frame.bold ? '700' : '400',
            fontStyle: frame.italic ? 'italic' : 'normal',
            color: frame.color ?? baseColor,
          }}>
          {decodeEntities(token)}
        </Text>
      );
    }
  }
  return nodes;
}

export function CommentaryText({ html, style }: { html: string; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[{ color: theme.text, fontSize: 15, lineHeight: 24 }, style]}>{renderCommentaryHtml(html, theme.text)}</Text>;
}
