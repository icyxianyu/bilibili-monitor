import { getDb } from '../schema.js';
import type { RoomInfo } from '@bilibili-monitor/shared';

interface StreamStatusRow {
  id: number;
  room_id: number;
  title: string;
  live_status: number;
  area_name: string;
  parent_area_name: string;
  online: number;
  cover_url: string;
  updated_at: string;
}

export function upsertStreamStatus(info: RoomInfo): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO stream_status (room_id, title, live_status, area_name, parent_area_name, online, cover_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET
      title = excluded.title,
      live_status = excluded.live_status,
      area_name = excluded.area_name,
      parent_area_name = excluded.parent_area_name,
      online = excluded.online,
      cover_url = excluded.cover_url,
      updated_at = excluded.updated_at
  `).run(
    info.roomId,
    info.title,
    info.liveStatus,
    info.areaName,
    info.parentAreaName,
    info.online,
    info.coverUrl,
    new Date().toISOString(),
  );
}

export function getStreamStatus(roomId: number): RoomInfo | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM stream_status WHERE room_id = ?')
    .get(roomId) as StreamStatusRow | undefined;

  if (!row) return null;

  return {
    roomId: row.room_id,
    shortId: 0,
    uid: 0,
    title: row.title,
    liveStatus: row.live_status as 0 | 1 | 2,
    liveStartTime: 0,
    areaId: 0,
    areaName: row.area_name,
    parentAreaId: 0,
    parentAreaName: row.parent_area_name,
    online: row.online,
    coverUrl: row.cover_url,
    description: '',
    tags: '',
  };
}
