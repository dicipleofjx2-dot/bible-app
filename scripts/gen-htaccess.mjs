// 호스팅어(Apache/LiteSpeed)용 설정을 dist 에 만든다. Vercel 의 vercel.json
// (rewrites·cleanUrls)이 하던 일을 .htaccess 로 옮긴 것.
//
// 규칙은 dist 를 읽어서 만든다 — `post/[id].html` 같은 동적 화면이 새로 생겨도
// 손으로 규칙을 보태지 않는다. (vercel.json 은 손으로 12개만 적어 둬서 빠진 것이 있었다.)
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = process.argv[2] ?? 'dist';

/** dist 아래 모든 .html 의 상대 경로(슬래시 구분) */
function htmlFiles(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(p).isDirectory()) {
      if (rel === '_expo' || rel === 'assets' || rel === 'node_modules') continue;
      out.push(...htmlFiles(p, rel));
    } else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const esc = (s) => s.replace(/[.+*?^${}()|\\]/g, '\\$&');

const dynamic = htmlFiles(DIST)
  .filter((f) => f.includes('['))
  .map((f) => {
    const route = f.replace(/\.html$/, '');
    const segs = route.split('/');
    const literal = segs.filter((s) => !s.startsWith('[')).length;
    const pattern = segs
      .map((s) => (s.startsWith('[...') ? '.+' : s.startsWith('[') ? '[^/]+' : esc(s)))
      .join('/');
    return { route, literal, depth: segs.length, pattern, target: `/${f}` };
  })
  // 글자로 적힌 칸이 많은 것(더 구체적인 것)이 먼저
  .sort((a, b) => b.literal - a.literal || b.depth - a.depth || a.route.localeCompare(b.route));

const lines = [];
lines.push(
  '# 자동 생성 — scripts/gen-htaccess.mjs. 손으로 고치지 말고 스크립트를 고친다.',
  'DirectoryIndex index.html',
  'Options -Indexes -MultiViews',
  'ErrorDocument 404 /+not-found.html',
  '',
  '<IfModule mod_rewrite.c>',
  'RewriteEngine On',
  '',
  '# 1) https 강제',
  'RewriteCond %{HTTPS} off',
  'RewriteCond %{HTTP:X-Forwarded-Proto} !https',
  'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]',
  '',
  '# 2) 깔끔한 주소: /foo → /foo.html (끝의 / 는 허용)',
  'RewriteCond %{DOCUMENT_ROOT}/$1.html -f',
  'RewriteRule ^(.+?)/?$ /$1.html [L]',
  '',
  '# 3) 실제로 있는 파일·폴더는 그대로 준다',
  'RewriteCond %{REQUEST_FILENAME} -f [OR]',
  'RewriteCond %{REQUEST_FILENAME} -d',
  'RewriteRule ^ - [L]',
  '',
  '# 4) 동적 화면: /post/123 → /post/[id].html',
);
for (const d of dynamic) lines.push(`RewriteRule ^${d.pattern}/?$ ${d.target} [L]`);
lines.push(
  '</IfModule>',
  '',
  '# 압축',
  '<IfModule mod_deflate.c>',
  'AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript text/javascript application/json application/manifest+json image/svg+xml application/wasm',
  '<FilesMatch "\\.db$">',
  'SetOutputFilter DEFLATE',
  '</FilesMatch>',
  '</IfModule>',
  '',
  '<IfModule mod_mime.c>',
  'AddType application/wasm .wasm',
  'AddType application/manifest+json .webmanifest',
  'AddType text/javascript .mjs',
  'AddType application/octet-stream .db',
  '</IfModule>',
  '',
  '# 캐시: 문서·서비스워커·매니페스트는 매번 확인, 해시 붙은 정적 파일은 1년 (아래 두 폴더의 .htaccess)',
  '<IfModule mod_headers.c>',
  '<FilesMatch "\\.(html|webmanifest)$|^(sw|coupang-sw)\\.js$">',
  'Header set Cache-Control "no-cache"',
  '</FilesMatch>',
  '</IfModule>',
  '',
);
writeFileSync(path.join(DIST, '.htaccess'), lines.join('\n'));

// 파일 이름에 해시가 붙는 폴더 — 바뀌면 이름이 바뀌므로 오래 캐시해도 안전하다.
const immutable = [
  '<IfModule mod_headers.c>',
  'Header set Cache-Control "public, max-age=31536000, immutable"',
  '</IfModule>',
  '',
].join('\n');
for (const dir of ['_expo', 'assets']) {
  const p = path.join(DIST, dir);
  if (existsSync(p)) writeFileSync(path.join(p, '.htaccess'), immutable);
}

console.log(`동적 화면 규칙 ${dynamic.length}개`);
for (const d of dynamic) console.log(`  /${d.route}`);
