/** 과마다 강의 영상 QR 코드(out/qr/N.png). npm i --no-save qrcode@1.5.4 */
const fs = require('fs');
const path = require('path');
const QR = require('qrcode');
const { LESSONS } = require('../../content/bible-flow/nt2.cjs');
const dir = path.join(__dirname, '../../content/bible-flow/out/qr');
fs.mkdirSync(dir, { recursive: true });
(async () => {
  for (const l of LESSONS) if (l.video) {
    await QR.toFile(path.join(dir, `${l.no}.png`), l.video, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
    console.log('qr', l.no, l.video);
  }
})();
