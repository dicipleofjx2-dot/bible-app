/** 성경맥잡기 — 전자책(.docx)과 과별 PPT(.pptx)를 한 번에 굽는다. 사용법은 content/bible-flow/README.md */
const path = require('path');
const out = path.join(__dirname, '../../content/bible-flow/out');
(async () => {
  await require('./build-docx.cjs').build(path.join(out, '성경맥잡기1-신약편.docx'));
  await require('./build-pptx.cjs').build(out);
})();
