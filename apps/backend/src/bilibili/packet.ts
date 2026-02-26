import { WsOperation, WsVersion } from '@bilibili-monitor/shared';
import { createRequire } from 'module';

// Use require for brotli since it's a native addon in some envs
// Node.js 10.16+ has built-in zlib.brotliDecompressSync
import { brotliDecompressSync, inflateSync } from 'zlib';

const HEADER_LENGTH = 16;

export interface Packet {
  header: {
    totalLength: number;
    headerLength: number;
    version: number;
    operation: WsOperation;
    sequence: number;
  };
  body: Buffer;
}

export function encodePacket(operation: WsOperation, body: object | string): Buffer {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const bodyBuf = Buffer.from(bodyStr, 'utf-8');
  const totalLength = HEADER_LENGTH + bodyBuf.length;

  const buf = Buffer.allocUnsafe(totalLength);
  buf.writeUInt32BE(totalLength, 0);
  buf.writeUInt16BE(HEADER_LENGTH, 4);
  buf.writeUInt16BE(WsVersion.Json, 6);
  buf.writeUInt32BE(operation, 8);
  buf.writeUInt32BE(1, 12); // sequence
  bodyBuf.copy(buf, HEADER_LENGTH);

  return buf;
}

export function decodePackets(buf: Buffer): Packet[] {
  const packets: Packet[] = [];
  let offset = 0;

  while (offset < buf.length) {
    if (offset + HEADER_LENGTH > buf.length) break;

    const totalLength = buf.readUInt32BE(offset);
    const headerLength = buf.readUInt16BE(offset + 4);
    const version = buf.readUInt16BE(offset + 6);
    const operation = buf.readUInt32BE(offset + 8) as WsOperation;
    const sequence = buf.readUInt32BE(offset + 12);

    if (totalLength < HEADER_LENGTH || offset + totalLength > buf.length) break;

    const body = buf.subarray(offset + headerLength, offset + totalLength);

    if (version === WsVersion.Brotli) {
      // Decompress brotli and recurse
      try {
        const decompressed = brotliDecompressSync(body);
        packets.push(...decodePackets(decompressed));
      } catch (e) {
        console.error('Brotli decompress failed:', e);
      }
    } else if (version === WsVersion.Deflate) {
      try {
        const decompressed = inflateSync(body);
        packets.push(...decodePackets(decompressed));
      } catch (e) {
        console.error('Deflate decompress failed:', e);
      }
    } else {
      packets.push({
        header: { totalLength, headerLength, version, operation, sequence },
        body,
      });
    }

    offset += totalLength;
  }

  return packets;
}

export function parseHeartbeatReply(body: Buffer): number {
  return body.readUInt32BE(0);
}
