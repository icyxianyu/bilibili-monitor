import { getDb } from '../schema.js';
import type { MonitorEvent } from '@bilibili-monitor/shared';

export interface EventRow {
  id: string;
  room_id: number;
  type: string;
  payload: string;
  created_at: string;
}

export function insertEvent(event: MonitorEvent): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (id, room_id, type, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    event.id,
    event.roomId,
    event.type,
    JSON.stringify(event),
    event.createdAt.toISOString(),
  );
}

export interface ListEventsOptions {
  roomId: number;
  limit?: number;
  offset?: number;
  type?: string;
}

export function listEvents(opts: ListEventsOptions): MonitorEvent[] {
  const db = getDb();
  const { roomId, limit = 50, offset = 0, type } = opts;

  let sql = 'SELECT payload FROM events WHERE room_id = ?';
  const params: unknown[] = [roomId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as { payload: string }[];
  return rows.map((r) => JSON.parse(r.payload) as MonitorEvent);
}

export function getLatestEventByType(roomId: number, type: string): MonitorEvent | null {
  const db = getDb();
  const row = db
    .prepare('SELECT payload FROM events WHERE room_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
    .get(roomId, type) as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as MonitorEvent) : null;
}
