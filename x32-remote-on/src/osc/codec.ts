// OSC 1.0 인코더/디코더. X32 는 i(int32)·f(float32)·s(string)·b(blob) 만 쓴다.
export type OscArg = { t: 'i'; v: number } | { t: 'f'; v: number } | { t: 's'; v: string } | { t: 'b'; v: Uint8Array };
export type OscMessage = { address: string; args: OscArg[] };

const enc = new TextEncoder();
const dec = new TextDecoder();
const pad4 = (n: number) => (n + 3) & ~3;

function oscString(s: string): Uint8Array {
  const b = enc.encode(s);
  const out = new Uint8Array(pad4(b.length + 1));
  out.set(b);
  return out;
}

export function encode(msg: OscMessage): Uint8Array {
  const parts: Uint8Array[] = [oscString(msg.address), oscString(',' + msg.args.map((a) => a.t).join(''))];
  for (const a of msg.args) {
    if (a.t === 'i' || a.t === 'f') {
      const b = new Uint8Array(4);
      const dv = new DataView(b.buffer);
      a.t === 'i' ? dv.setInt32(0, a.v) : dv.setFloat32(0, a.v);
      parts.push(b);
    } else if (a.t === 's') parts.push(oscString(a.v));
    else {
      const b = new Uint8Array(4 + pad4(a.v.length));
      new DataView(b.buffer).setInt32(0, a.v.length);
      b.set(a.v, 4);
      parts.push(b);
    }
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), (o += p.length));
  return out;
}

function readString(buf: Uint8Array, off: number): [string, number] {
  let end = off;
  while (end < buf.length && buf[end] !== 0) end++;
  if (end >= buf.length) throw new Error('OSC 문자열이 끝나지 않음');
  return [dec.decode(buf.subarray(off, end)), pad4(end + 1)];
}

/** 깨진 패킷은 null. UDP 라 무엇이든 올 수 있고, 한 패킷 때문에 수신 루프가 죽으면 안 된다. */
export function decode(buf: Uint8Array): OscMessage | null {
  try {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let [address, off] = readString(buf, 0);
    if (!address.startsWith('/')) return null;
    if (off >= buf.length) return { address, args: [] };
    let tags: string;
    [tags, off] = readString(buf, off);
    if (!tags.startsWith(',')) return null;
    const args: OscArg[] = [];
    for (const t of tags.slice(1)) {
      if (t === 'i') (args.push({ t, v: dv.getInt32(off) }), (off += 4));
      else if (t === 'f') (args.push({ t, v: dv.getFloat32(off) }), (off += 4));
      else if (t === 's') {
        let v: string;
        [v, off] = readString(buf, off);
        args.push({ t, v });
      } else if (t === 'b') {
        const n = dv.getInt32(off);
        args.push({ t, v: buf.slice(off + 4, off + 4 + n) });
        off += 4 + pad4(n);
      } else return null;
      if (off > buf.length) return null;
    }
    return { address, args };
  } catch {
    return null;
  }
}

export const i = (v: number): OscArg => ({ t: 'i', v });
export const f = (v: number): OscArg => ({ t: 'f', v });
export const s = (v: string): OscArg => ({ t: 's', v });
