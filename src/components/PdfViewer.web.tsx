import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import type * as PdfJs from 'pdfjs-dist';

/**
 * pdf.js를 **브라우저에서 처음 볼 때** 불러온다.
 *
 * 맨 위에서 import하면 안 된다. Expo 웹 내보내기는 화면을 Node에서 미리 그려
 * 보는데, 그때 pdf.js가 실행되면서 브라우저에만 있는 것(DOMMatrix)을 찾다가
 * 빌드가 통째로 실패한다.
 *
 * import()로 늦게 부르는 것도 안 된다. 그러면 Metro가 그 조각을 따로 만들지
 * 못해 화면에서 "Requiring unknown module"로 죽는다.
 *
 * 그래서 require를 함수 안에 둔다 — 번들에는 들어가되 실행은 부를 때 한 번만
 * 일어난다. Node는 이 함수를 부르지 않으므로 안전하다.
 */
let pdfjsPromise: Promise<typeof PdfJs> | null = null;

function loadPdfjs(): Promise<typeof PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.resolve().then(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('pdfjs-dist') as typeof PdfJs;
      // 워커 파일은 public/에 복사해 두고 주소로 알려준다. 번들러마다 워커를
      // 끌어오는 방법이 달라, 파일을 그대로 두는 쪽이 어디서든 확실하다.
      mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return mod;
    });
  }
  return pdfjsPromise;
}

/**
 * 웹에서 PDF를 **우리가 직접 그린다.**
 *
 * 예전에는 iframe에 파일 주소를 걸고 브라우저에 맡겼다. 데스크톱 크롬·사파리·
 * 파이어폭스는 PDF 뷰어를 내장하고 있어서 그것으로 잘 떴다.
 *
 * 그런데 **휴대폰 브라우저에는 그 내장 뷰어가 없다.** 안드로이드 크롬도 iOS
 * 사파리도 iframe 안의 PDF를 그리지 못하고 빈 화면만 남긴다. 그래서 "책을
 * 열었는데 아무것도 안 보인다"가 됐다. 새 탭에서 열면 브라우저가 파일로
 * 넘겨받아 다른 앱(삼성 노트 등)으로 여는데, 그건 책을 읽는 길이 아니다.
 *
 * 전자책 앱이 휴대폰에서 책을 못 보여주면 안 되므로 브라우저에 기대지 않는다.
 * pdf.js로 페이지를 캔버스에 그린다 — 기기가 PDF를 알든 모르든 똑같이 보인다.
 *
 * 한꺼번에 다 그리지 않는다. 200쪽짜리 책을 한 번에 그리면 휴대폰이 멎는다.
 * 화면에 가까워진 쪽만 그리고, 지나간 쪽은 그대로 둔다(다시 그리지 않아도
 * 캔버스가 남아 있다).
 */
export function PdfViewer({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [message, setMessage] = useState('책을 여는 중입니다…');

  const render = useCallback(async () => {
    const host = hostRef.current;
    if (!host) return;

    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ url, withCredentials: false }).promise;
      setPageCount(doc.numPages);
      setStatus('ready');

      // 가로 폭에 맞춘다. 휴대폰에서 좌우로 밀어야 글이 보이면 못 읽는다.
      const cssWidth = Math.max(280, host.clientWidth - 16);
      // 화면이 촘촘한 기기에서 흐릿하지 않게. 다만 3배를 넘기면 메모리만 먹는다.
      const scaleFactor = Math.min(window.devicePixelRatio || 1, 3);

      // 첫 쪽으로 종이 비율을 잡는다. 쪽마다 자리를 미리 정확한 높이로 잡아 두면
      // 그리는 순간 화면이 덜컹이지 않는다.
      const first = await doc.getPage(1);
      const firstViewport = first.getViewport({ scale: 1 });
      const ratio = firstViewport.height / firstViewport.width;

      const drawn = new Set<number>();

      async function draw(pageNumber: number, canvas: HTMLCanvasElement) {
        if (drawn.has(pageNumber)) return;
        drawn.add(pageNumber);
        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * scaleFactor });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvas, viewport }).promise;
      }

      host.innerHTML = '';
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const canvas = document.createElement('canvas');
        // 그리기 전에도 종이 비율대로 자리를 차지하게 한다. width:100% + height:auto면
        // 캔버스의 가로세로 픽셀 비율이 그대로 화면 비율이 된다.
        canvas.width = 100;
        canvas.height = Math.round(100 * ratio);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto 12px';
        canvas.style.backgroundColor = '#ffffff';
        canvas.style.borderRadius = '4px';
        canvas.dataset.page = String(i);
        host.appendChild(canvas);
        canvases.push(canvas);
      }

      /**
       * 화면 가까이 온 쪽만 그린다.
       *
       * IntersectionObserver를 쓰지 않는다. 그것은 화면이 실제로 그려질 때만
       * 울리는데, 그 조건이 안 맞으면 아무 쪽도 안 그려진 채로 조용히 멈춘다.
       * 스크롤 위치로 직접 셈하면 언제나 같은 결과가 나온다.
       */
      function drawVisible() {
        const view = host!.clientHeight;
        const top = host!.scrollTop;
        // 한 화면 앞뒤로 넉넉히. 넘길 때 흰 종이가 스치지 않는다.
        const from = top - view;
        const to = top + view * 2;
        for (const canvas of canvases) {
          const y = canvas.offsetTop - host!.offsetTop;
          if (y + canvas.clientHeight >= from && y <= to) {
            void draw(Number(canvas.dataset.page), canvas);
          }
        }
      }

      let ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.setTimeout(() => {
          ticking = false;
          drawVisible();
        }, 80);
      }
      host.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });

      // 첫 화면은 기다리지 않고 그린다.
      await draw(1, canvases[0]);
      drawVisible();

      return () => {
        host!.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? `책을 열지 못했습니다 — ${error.message}`
          : '책을 열지 못했습니다.',
      );
    }
    return undefined;
  }, [url]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void render().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [render]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      {status !== 'ready' ? (
        <div
          style={{
            padding: '14px 12px',
            textAlign: 'center',
            fontSize: 13,
            color: status === 'error' ? '#c92a2a' : '#6B6558',
          }}>
          {message}
        </div>
      ) : null}

      {/* react-native-web은 소문자 태그를 그대로 DOM 엘리먼트로 렌더링한다 */}
      <div
        ref={hostRef}
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: '#f5f3ee',
          padding: 8,
        }}
      />

      {status === 'ready' && pageCount > 0 ? (
        <div style={{ padding: '6px 12px', textAlign: 'center', fontSize: 12, color: '#8a8477' }}>
          모두 {pageCount}쪽
        </div>
      ) : null}

      {/* 그리기가 실패해도 책을 볼 길은 남겨 둔다. */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          padding: '10px 12px',
          textAlign: 'center',
          fontSize: 13,
          color: '#6B6558',
          textDecoration: 'underline',
        }}>
        파일로 내려받기
      </a>
    </View>
  );
}
