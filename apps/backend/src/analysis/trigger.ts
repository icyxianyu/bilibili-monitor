import { randomUUID } from 'crypto';
import { eventBus } from '../core/event-bus.js';
import { insertEvent, getLatestAutoAnalysis } from '../db/repositories/events.js';
import { getRecentDanmaku } from '../db/repositories/danmaku.js';
import { analyzeDanmaku } from './llm-client.js';
import { config } from '../config/index.js';
import type { LlmAnalysisEvent } from '@bilibili-monitor/shared';

const WINDOW_SIZE_MS = 30_000;         // 30s sliding window
const EMA_ALPHA = 0.2;
const BURST_MULTIPLIER = 3;            // >3x baseline
const BURST_ABSOLUTE_COUNT = 50;       // >50 in 30s
const COOLDOWN_MS = 5 * 60_000;       // 5 min
const PERIODIC_INTERVAL_MS = 10 * 60_000; // 10 min

interface DanmakuEntry {
  content: string;
  timestamp: number;
}

export class DanmakuTrigger {
  private windowEntries: DanmakuEntry[] = [];
  private emaBaseline = 0;
  private lastTriggerTime = 0;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private isLive = false;
  private streamStatusListener: ((data: { roomId: number; liveStatus: number; title: string }) => void) | null = null;

  constructor(private readonly roomId: number) {}

  start(): void {
    // Periodic 10-min analysis when live
    this.periodicTimer = setInterval(async () => {
      if (this.isLive) {
        await this.runAnalysis('periodic');
      }
    }, PERIODIC_INTERVAL_MS);

    // Listen to stream status, filter by roomId
    this.streamStatusListener = ({ roomId, liveStatus }) => {
      if (roomId === this.roomId) this.isLive = liveStatus === 1;
    };
    eventBus.onStreamStatus(this.streamStatusListener);
  }

  stop(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
    if (this.streamStatusListener) {
      eventBus.removeListener('stream:status', this.streamStatusListener);
      this.streamStatusListener = null;
    }
  }

  addDanmaku(content: string): void {
    const now = Date.now();
    this.windowEntries.push({ content, timestamp: now });
    this.purgeWindow(now);
    this.updateEma(now);
    this.checkBurst(now);
  }

  private purgeWindow(now: number): void {
    const cutoff = now - WINDOW_SIZE_MS;
    this.windowEntries = this.windowEntries.filter((e) => e.timestamp >= cutoff);
  }

  private updateEma(now: number): void {
    const windowCount = this.windowEntries.length;
    // Treat window count as current rate proxy
    if (this.emaBaseline === 0) {
      this.emaBaseline = windowCount;
    } else {
      this.emaBaseline = EMA_ALPHA * windowCount + (1 - EMA_ALPHA) * this.emaBaseline;
    }
  }

  private checkBurst(now: number): void {
    const cooldownExpired = now - this.lastTriggerTime > COOLDOWN_MS;
    if (!cooldownExpired) return;

    const windowCount = this.windowEntries.length;
    const rateExceeded = this.emaBaseline > 0 && windowCount > this.emaBaseline * BURST_MULTIPLIER;
    const absoluteExceeded = windowCount > BURST_ABSOLUTE_COUNT;

    if (rateExceeded || absoluteExceeded) {
      this.lastTriggerTime = now;
      this.triggerBurst(windowCount).catch((err) => {
        console.error('[Trigger] Burst trigger error:', err);
      });
    }
  }

  private async triggerBurst(windowCount: number): Promise<void> {
    console.log(`[Trigger] Danmaku burst detected: ${windowCount} in 30s, baseline=${this.emaBaseline.toFixed(1)}`);

    const burstEvent = {
      id: randomUUID(),
      roomId: this.roomId,
      type: 'danmaku_burst' as const,
      createdAt: new Date(),
      count: windowCount,
      baseline: Math.round(this.emaBaseline),
    };
    insertEvent(burstEvent);
    eventBus.emitMonitorEvent(burstEvent);

    await this.runAnalysis('burst');
  }

  private async runAnalysis(trigger: 'burst' | 'periodic'): Promise<void> {
    if (!config.LLM_API_KEY) {
      console.log('[Trigger] LLM_API_KEY not set, skipping analysis');
      return;
    }
    try {
      const windowUntil = Date.now();
      const recentDanmaku = getRecentDanmaku(this.roomId, 100);
      if (recentDanmaku.length === 0) return;

      const danmakuContents = recentDanmaku
        .reverse()
        .map((d) => `${d.username}: ${d.content}`);

      const windowSince = recentDanmaku[0]?.timestamp ?? windowUntil - 10 * 60_000;

      // Only use previous auto-analysis as context, not manual ones
      const prevEvent = getLatestAutoAnalysis(this.roomId) as LlmAnalysisEvent | null;
      const previousSummary = prevEvent?.summary;

      console.log(`[Trigger] Running LLM analysis (${trigger}) on ${danmakuContents.length} messages`);
      const result = await analyzeDanmaku(danmakuContents, previousSummary);

      const analysisEvent: LlmAnalysisEvent = {
        id: randomUUID(),
        roomId: this.roomId,
        type: 'llm_analysis',
        createdAt: new Date(windowUntil),
        trigger: 'auto',
        windowSince,
        windowUntil,
        summary: result.summary,
        sentiment: result.sentiment,
        significantChange: result.significantChange,
        changeDescription: result.changeDescription,
        topKeywords: result.topKeywords,
      };

      insertEvent(analysisEvent);
      eventBus.emitMonitorEvent(analysisEvent);
      console.log(`[Trigger] LLM analysis complete: ${result.summary}`);
    } catch (err) {
      console.error('[Trigger] LLM analysis error:', err);
    }
  }
}
