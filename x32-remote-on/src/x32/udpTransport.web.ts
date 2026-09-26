import type { Transport } from './transport';

/** 브라우저는 UDP 를 못 연다. 웹에서는 시뮬레이터만 쓴다. */
export function createUdpTransport(_host: string, _port: number): Transport {
  throw new Error('브라우저에서는 실제 X32 에 연결할 수 없습니다. 안드로이드 앱을 쓰거나 시뮬레이터를 켜 주세요.');
}
