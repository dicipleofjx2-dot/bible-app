import dgram from 'react-native-udp';
import { Buffer } from 'buffer';
import type { Transport } from './transport';

/** 안드로이드 앱 전용. 같은 공유기 안의 X32 에 OSC 를 UDP 로 보낸다. */
export function createUdpTransport(host: string, port: number): Transport {
  const sock = dgram.createSocket({ type: 'udp4' });
  let cb: ((d: Uint8Array) => void) | null = null;
  let closed = false;
  // 라이브러리 타입 선언이 EventEmitter 를 못 끌어와 on 이 빠져 있다. 런타임에는 있다.
  const ev = sock as unknown as { on(e: string, fn: (...a: any[]) => void): void };
  sock.bind(0);
  ev.on('message', (msg: Buffer) => cb?.(new Uint8Array(msg)));
  // 소켓 오류로 앱이 죽지 않게 한다. 끊김 판정은 client 의 심장박동이 맡는다.
  ev.on('error', () => {});
  return {
    send(data) {
      if (closed) return;
      sock.send(Buffer.from(data), 0, data.length, port, host, () => {});
    },
    onMessage(fn) {
      cb = fn;
    },
    close() {
      closed = true;
      try {
        sock.close();
      } catch {}
    },
  };
}
