// 믹서와 바이트를 주고받는 길. 앱은 UDP, 웹·검사는 시뮬레이터를 끼운다.
export interface Transport {
  send(data: Uint8Array): void;
  onMessage(cb: (data: Uint8Array) => void): void;
  close(): void;
}

export const X32_PORT = 10023;
