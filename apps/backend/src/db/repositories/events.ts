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
  /** Filter to a specific day, format: YYYY-MM-DD (local time) */
  date?: string;
}

export function listEvents(opts: ListEventsOptions): MonitorEvent[] {
  const db = getDb();
  const { roomId, limit = 50, offset = 0, type, date } = opts;

  let sql = 'SELECT payload FROM events WHERE room_id = ?';
  const params: unknown[] = [roomId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  if (date) {
    const start = new Date(`${date}T00:00:00`).toISOString();
    const end = new Date(`${date}T23:59:59.999`).toISOString();
    sql += ' AND created_at >= ? AND created_at <= ?';
    params.push(start, end);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as { payload: string }[];
  return rows.map((r) => JSON.parse(r.payload) as MonitorEvent);
}

export function countEvents(opts: Omit<ListEventsOptions, 'limit' | 'offset'>): number {
  const db = getDb();
  const { roomId, type, date } = opts;

  let sql = 'SELECT COUNT(*) as cnt FROM events WHERE room_id = ?';
  const params: unknown[] = [roomId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  if (date) {
    const start = new Date(`${date}T00:00:00`).toISOString();
    const end = new Date(`${date}T23:59:59.999`).toISOString();
    sql += ' AND created_at >= ? AND created_at <= ?';
    params.push(start, end);
  }

  const row = db.prepare(sql).get(...params) as { cnt: number };
  return row.cnt;
}

export function getLatestEventByType(roomId: number, type: string): MonitorEvent | null {
  const db = getDb();
  const row = db
    .prepare('SELECT payload FROM events WHERE room_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
    .get(roomId, type) as { payload: string } | undefined;
  return row ? (JSON.parse(row.payload) as MonitorEvent) : null;
}

/**
 * Returns the latest llm_analysis event that was triggered automatically (trigger === 'auto').
 * Used so that manual analyses don't pollute the auto-analysis summary chain.
 */
export function getLatestAutoAnalysis(roomId: number): MonitorEvent | null {
  const db = getDb();
  const rows = db
    .prepare('SELECT payload FROM events WHERE room_id = ? AND type = ? ORDER BY created_at DESC LIMIT 20')
    .all(roomId, 'llm_analysis') as { payload: string }[];
  for (const row of rows) {
    const event = JSON.parse(row.payload) as { trigger?: string } & MonitorEvent;
    if (!event.trigger || event.trigger === 'auto') return event;
  }
  return null;
}
