import axios from 'axios';
import type { RoomInfo, DanmuInfo } from '@bilibili-monitor/shared';
import { config } from '../config/index.js';
import { signWbi } from './wbi.js';

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://live.bilibili.com/',
  Origin: 'https://live.bilibili.com',
};

function getHeaders() {
  const headers: Record<string, string> = { ...BASE_HEADERS };
  if (config.BILIBILI_COOKIE) {
    headers['Cookie'] = config.BILIBILI_COOKIE;
  }
  return headers;
}

export async function getRoomInfo(roomId: number): Promise<RoomInfo> {
  const res = await axios.get('https://api.live.bilibili.com/room/v1/Room/get_info', {
    params: { room_id: roomId },
    headers: getHeaders(),
  });

  const data = res.data;
  if (data.code !== 0) {
    throw new Error(`Bilibili API error: ${data.message}`);
  }

  const d = data.data;
  return {
    roomId: d.room_id,
    shortId: d.short_id,
    uid: d.uid,
    title: d.title,
    liveStatus: d.live_status,
    liveStartTime: d.live_time ? new Date(d.live_time).getTime() : 0,
    areaId: d.area_id,
    areaName: d.area_name,
    parentAreaId: d.parent_area_id,
    parentAreaName: d.parent_area_name,
    online: d.online,
    coverUrl: d.user_cover || d.keyframe || '',
    description: d.description || '',
    tags: d.tags || '',
  };
}

export async function getRealRoomId(roomId: number): Promise<number> {
  const info = await getRoomInfo(roomId);
  return info.roomId;
}

export async function getDanmuInfo(roomId: number): Promise<DanmuInfo> {
  const query = await signWbi({ id: roomId, type: 0 });
  const res = await axios.get(
    `https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?${query}`,
    { headers: getHeaders() },
  );

  const data = res.data;
  if (data.code !== 0) {
    throw new Error(`Bilibili danmu info error: ${data.message}`);
  }

  return {
    token: data.data.token,
    hostList: data.data.host_list.map((h: { host: string; port: number; wss_port: number; ws_port: number }) => ({
      host: h.host,
      port: h.port,
      wssPort: h.wss_port,
      wsPort: h.ws_port,
    })),
  };
}
