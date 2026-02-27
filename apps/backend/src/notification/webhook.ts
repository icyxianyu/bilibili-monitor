import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';
import type { MonitorEvent, WebhookPayload } from '@bilibili-monitor/shared';
import { getStreamStatus } from '../db/repositories/streamStatus.js';

export async function sendWebhook(event: MonitorEvent): Promise<void> {
  if (!config.WEBHOOK_URL) return;

  const roomId = event.roomId;
  const status = getStreamStatus(roomId);

  const payload: WebhookPayload = {
    event,
    stream: {
      roomId,
      title: status?.title ?? '',
      liveStatus: status?.liveStatus ?? 0,
      areaName: status?.areaName ?? '',
      parentAreaName: status?.parentAreaName ?? '',
      online: status?.online ?? 0,
      coverUrl: status?.coverUrl ?? '',
    },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.WEBHOOK_SECRET) {
    const signature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  try {
    await axios.post(config.WEBHOOK_URL, body, { headers, timeout: 10_000 });
    console.log(`[Webhook] Sent event: ${event.type}`);
  } catch (err) {
    console.error('[Webhook] Failed to send:', err);
  }
}
