/**
 * 서비스 롤 키를 찾아 준다.
 *
 * 이 키는 리포에 두지 않는다(공개 저장소에 올라가면 끝이다). 그런데 매번 손으로
 * 넣게 하면 두 가지가 실제로 일어났다 — 안내문의 「여기에키」를 그대로 두고
 * 돌리거나, 대시보드까지 찾아가거나. 키는 이미 이 PC 에 있는데도 그랬다.
 *
 * 찾는 순서:
 *   1. 환경변수 SUPABASE_SERVICE_ROLE_KEY
 *   2. 환경변수 BIBLEAPP_KEY_FILE 이 가리키는 파일
 *   3. dg-smart-bulletin 의 .migration.env 안 NEW_SUPABASE_SERVICE_ROLE_KEY
 *      (매주 도는 예약 작업이 쓰는 자리와 같다)
 */
const fs = require('fs');

const DEFAULT_KEY_FILE = 'C:/Users/dicip/Documents/dg-smart-bulletin/.migration.env';
const VAR_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'NEW_SUPABASE_SERVICE_ROLE_KEY'];

function fromFile(file) {
  if (!file || !fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  for (const name of VAR_NAMES) {
    const m = text.match(new RegExp('^' + name + '=(.+)$', 'm'));
    if (m) return { key: m[1].trim(), where: `${file} 의 ${name}` };
  }
  return null;
}

function serviceKey() {
  const found =
    (process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { key: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), where: '환경변수 SUPABASE_SERVICE_ROLE_KEY' }
      : null) ??
    fromFile(process.env.BIBLEAPP_KEY_FILE) ??
    fromFile(DEFAULT_KEY_FILE);

  if (!found) {
    console.error('서비스 롤 키를 찾지 못했습니다. 다음 중 하나로 알려 주세요:');
    console.error('  · $env:SUPABASE_SERVICE_ROLE_KEY = "..."');
    console.error(`  · ${DEFAULT_KEY_FILE} 에 NEW_SUPABASE_SERVICE_ROLE_KEY=...`);
    console.error('  · $env:BIBLEAPP_KEY_FILE = "키가 든 다른 파일 경로"');
    process.exit(1);
  }

  // 안내문의 「여기에키」를 그대로 두면 한글이 HTTP 헤더에 실리려다 fetch 안쪽에서
  // ByteString 오류로 터진다. 그 오류만으로는 원인을 알 수 없어 여기서 거른다.
  if (!/^[\x20-\x7E]+$/.test(found.key)) {
    console.error(`키에 영문·숫자가 아닌 글자가 들어 있습니다 (${found.where}).`);
    console.error('안내문의 「여기에키」를 실제 키로 바꾸셨는지 보세요.');
    process.exit(1);
  }

  return found;
}

module.exports = { serviceKey };
