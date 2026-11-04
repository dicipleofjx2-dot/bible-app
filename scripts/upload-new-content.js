/**
 * main 에 없는(새로 추가된) 통독도우미 콘텐츠 파일만 골라 한글·영어 순으로 올린다.
 *
 *   node scripts/upload-new-content.js            # 올리기
 *   node scripts/upload-new-content.js --dry-run  # 무엇을 올릴지만 보기
 *
 * 왜 새 파일만인가: 이미 올라간 파일을 다시 올리면 서버에서 손본 내용이 파일
 * 내용으로 되돌아갈 수 있다(check-content.js 머리말 참고).
 *
 * PowerShell·Git Bash 어디서나 같게 돌도록 셸 반복문 대신 노드로 적었다.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const dry = process.argv.includes('--dry-run');
const base = process.env.BASE_REF || 'origin/main';

const out = execFileSync(
  'git',
  ['diff', '--name-only', '--diff-filter=A', base, '--', 'scripts/content/'],
  { cwd: root, encoding: 'utf8' }
);
const names = out.split('\n').map((s) => s.trim()).filter(Boolean).map((f) => path.basename(f));

if (names.length === 0) {
  console.log(`${base} 에 비해 새로 생긴 콘텐츠 파일이 없습니다.`);
  process.exit(0);
}
console.log(`새 파일 ${names.length}개${dry ? ' (--dry-run: 올리지 않음)' : ''}`);

let failed = [];
names.forEach((n, i) => {
  const ko = path.join(root, 'scripts', 'content', n);
  const en = path.join(root, 'scripts', 'content-en', n);
  console.log(`[${i + 1}/${names.length}] ${n}`);
  if (dry) return;
  for (const [script, file] of [
    ['upload-reading-helper-content.js', ko],
    ['upload-reading-helper-content-en.js', en],
  ]) {
    try {
      execFileSync(process.execPath, [path.join(__dirname, script), file], { cwd: root, stdio: 'inherit' });
    } catch {
      failed.push(`${script} ${n}`);
    }
  }
});

if (failed.length) {
  console.error(`\n실패 ${failed.length}건:\n  ` + failed.join('\n  '));
  process.exitCode = 1;
} else if (!dry) {
  console.log('\n모두 올렸습니다. 이어서: node scripts/check-content.js');
}
