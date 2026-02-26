import { getDb } from '../schema.js';
import type { DanmakuRecord } from '@bilibili-monitor/shared';

export function insertDanmaku(record: Omit<DanmakuRecord, 'id' | 'createdAt'>): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO danmaku (room_id, uid, username, content, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    record.roomId,
    record.uid,
    record.username,
    record.content,
    record.timestamp,
    new Date().toISOString(),
  );
}

export interface ListDanmakuOptions {
  roomId: number;
  since?: number;   // unix ms
  limit?: number;
}

export function listDanmaku(opts: ListDanmakuOptions): DanmakuRecord[] {
  const db = getDb();
  const { roomId, since, limit = 100 } = opts;

  let sql = 'SELECT * FROM danmaku WHERE room_id = ?';
  const params: unknown[] = [roomId];

  if (since !== undefined) {
    sql += ' AND timestamp >= ?';
    params.push(since);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    room_id: number;
    uid: number;
    username: string;
    content: string;
    timestamp: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    roomId: r.room_id,
    uid: r.uid,
    username: r.username,
    content: r.content,
    timestamp: r.timestamp,
    createdAt: r.created_at,
  }));
}

export function getRecentDanmaku(roomId: number, count: number): DanmakuRecord[] {
  return listDanmaku({ roomId, limit: count });
}
