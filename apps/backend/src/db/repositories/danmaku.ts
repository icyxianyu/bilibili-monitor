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
  until?: number;   // unix ms
  limit?: number;
}

export function listDanmaku(opts: ListDanmakuOptions): DanmakuRecord[] {
  const db = getDb();
  const { roomId, since, until, limit = 100 } = opts;

  let sql = 'SELECT * FROM danmaku WHERE room_id = ?';
  const params: unknown[] = [roomId];

  if (since !== undefined) {
    sql += ' AND timestamp >= ?';
    params.push(since);
  }

  if (until !== undefined) {
    sql += ' AND timestamp <= ?';
    params.push(until);
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

export interface DanmakuBucket {
  /** Unix ms of the start of this minute bucket */
  minuteTs: number;
  /** "HH:MM" label in local time */
  minute: string;
  count: number;
}

export interface GetDanmakuBucketsOptions {
  roomId: number;
  since: number; // unix ms
  until: number; // unix ms
}

/**
 * Aggregate danmaku counts per minute for a given time window.
 * Groups by truncated-to-minute unix timestamp so results are unambiguous across days.
 * Returns buckets ordered by minuteTs ascending.
 */
export function getDanmakuBuckets(opts: GetDanmakuBucketsOptions): DanmakuBucket[] {
  const db = getDb();
  const { roomId, since, until } = opts;

  // Truncate to minute by integer division, then multiply back
  const rows = db.prepare(`
    SELECT
      (CAST(timestamp / 60000 AS INTEGER) * 60000) AS minute_ts,
      strftime('%H:%M', datetime(CAST(timestamp / 1000 AS INTEGER), 'unixepoch', 'localtime')) AS minute,
      COUNT(*) AS count
    FROM danmaku
    WHERE room_id = ? AND timestamp >= ? AND timestamp <= ?
    GROUP BY minute_ts
    ORDER BY minute_ts ASC
  `).all(roomId, since, until) as Array<{ minute_ts: number; minute: string; count: number }>;

  return rows.map((r) => ({ minuteTs: r.minute_ts, minute: r.minute, count: r.count }));
}

/**
 * Returns the timestamp of the earliest danmaku record for the given room,
 * or null if there are no records.
 */
export function getEarliestDanmakuTimestamp(roomId: number): number | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT MIN(timestamp) AS ts FROM danmaku WHERE room_id = ?'
  ).get(roomId) as { ts: number | null };
  return row.ts ?? null;
}
