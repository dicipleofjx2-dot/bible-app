// 실제 UDP 로 X32 흉내를 낸다. 앱(안드로이드)을 장비 없이 붙여 보려면:
//   npm run emulator            → 이 컴퓨터의 10023 포트
//   앱 설정에서 이 컴퓨터의 IP 입력, 시뮬레이터 끄기
import dgram from 'node:dgram';
import { decode, encode } from '../src/osc/codec';
import { SimMixer } from '../src/x32/simMixer';

export function startEmulator(port = Number(process.env.PORT ?? 10023)) {
  const mixer = new SimMixer();
  const sock = dgram.createSocket('udp4');
  const replies = new Map<string, (m: any) => void>();
  sock.on('message', (buf, rinfo) => {
    const m = decode(new Uint8Array(buf));
    if (!m) return;
    const id = `${rinfo.address}:${rinfo.port}`;
    let reply = replies.get(id);
    if (!reply) {
      reply = (r) => sock.send(encode(r), rinfo.port, rinfo.address);
      replies.set(id, reply);
    }
    mixer.handle(m, reply);
  });
  return new Promise<{ mixer: SimMixer; close: () => void; port: number }>((res) =>
    sock.bind(port, () => res({ mixer, close: () => sock.close(), port: sock.address().port })),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startEmulator().then(({ port }) => console.log(`X32 에뮬레이터: udp/${port} 에서 대기 중`));
}
