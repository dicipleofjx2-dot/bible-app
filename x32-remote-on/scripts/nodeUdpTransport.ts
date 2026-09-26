import dgram from 'node:dgram';
import type { Transport } from '../src/x32/transport';

export function createNodeUdpTransport(host: string, port: number): Transport {
  const sock = dgram.createSocket('udp4');
  let cb: ((d: Uint8Array) => void) | null = null;
  sock.on('message', (m) => cb?.(new Uint8Array(m)));
  return {
    send: (d) => sock.send(d, port, host),
    onMessage: (fn) => void (cb = fn),
    close: () => sock.close(),
  };
}
