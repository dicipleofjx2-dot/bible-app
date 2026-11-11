/** 성경맥잡기 1단계 신약편 (맥점 순서판) — 전자책(.docx)과 PPT 9개(13장씩)를 한 번에 굽는다. 사용법은 content/bible-flow/README.md */
const path = require('path');
const { execFileSync } = require('child_process');
const out = path.join(__dirname, '../../content/bible-flow/out');
execFileSync(process.execPath, [path.join(__dirname, 'build-docx2.cjs'), path.join(out, '성경맥잡기1-신약편.docx')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'build-pptx2.cjs'), out], { stdio: 'inherit' });
