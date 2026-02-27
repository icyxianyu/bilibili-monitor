'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { apiClient } from '@/lib/api-client';
import type { LlmAnalysisEvent } from '@bilibili-monitor/shared';

interface LlmInsightProps {
  roomId: number;
  analysis: LlmAnalysisEvent | null;
  onNewAnalysis?: (event: LlmAnalysisEvent) => void;
}

const sentimentLabel: Record<string, string> = {
  positive: '积极',
  neutral: '中性',
  negative: '消极',
  excited: '激动',
};

const sentimentVariant: Record<string, 'success' | 'outline' | 'destructive' | 'default'> = {
  positive: 'success',
  neutral: 'outline',
  negative: 'destructive',
  excited: 'default',
};

const sentimentIcon: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😔',
  excited: '🔥',
};

/** Format a Date to the value string required by datetime-local input: "YYYY-MM-DDTHH:MM" */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultRange() {
  const until = new Date();
  const since = new Date(until.getTime() - 5 * 60_000);
  return { since: toDatetimeLocal(since), until: toDatetimeLocal(until) };
}

function AnalysisResult({ analysis }: { analysis: LlmAnalysisEvent }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>

      {analysis.significantChange && analysis.changeDescription && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
          <span className="text-amber-500 shrink-0 mt-0.5">⚡</span>
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-0.5">剧情变化</p>
            <p className="text-sm text-amber-700">{analysis.changeDescription}</p>
          </div>
        </div>
      )}

      {analysis.topKeywords.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">热词</p>
          <div className="flex flex-wrap gap-1">
            {analysis.topKeywords.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full border border-border"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-2">
        更新于 {new Date(analysis.createdAt).toLocaleString('zh-CN')}
      </p>
    </div>
  );
}

export function LlmInsight({ roomId, analysis, onNewAnalysis }: LlmInsightProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [range, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualResult, setManualResult] = useState<LlmAnalysisEvent | null>(null);

  const MAX_WINDOW_MS = 10 * 60_000;

  function handleModeSwitch(next: 'auto' | 'manual') {
    if (next === 'manual') {
      setRange(defaultRange());
      setError(null);
    }
    setMode(next);
  }

  function setSince(val: string) {
    setRange((r) => {
      if (val >= r.until) {
        const sinceMs = new Date(val).getTime();
        const until = toDatetimeLocal(new Date(sinceMs + 5 * 60_000));
        return { since: val, until };
      }
      return { ...r, since: val };
    });
  }

  function setUntil(val: string) {
    setRange((r) => {
      if (val <= r.since) {
        const untilMs = new Date(val).getTime();
        const since = toDatetimeLocal(new Date(untilMs - 5 * 60_000));
        return { since, until: val };
      }
      return { ...r, until: val };
    });
  }

  const sinceMs = new Date(range.since).getTime();
  const untilMs = new Date(range.until).getTime();
  const windowMs = untilMs - sinceMs;
  const windowMinutes = Math.round(windowMs / 60_000);
  const overCap = windowMs > MAX_WINDOW_MS;

  async function runManualAnalysis() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.triggerManualAnalysis(roomId, {
        since: sinceMs,
        until: untilMs,
      });
      setManualResult(result);
      onNewAnalysis?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  const displayedAnalysis = mode === 'manual' ? manualResult : analysis;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-primary stroke-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <CardTitle>AI 分析洞察</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {displayedAnalysis && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{sentimentIcon[displayedAnalysis.sentiment] ?? ''}</span>
                <Badge variant={sentimentVariant[displayedAnalysis.sentiment]}>
                  {sentimentLabel[displayedAnalysis.sentiment] ?? displayedAnalysis.sentiment}
                </Badge>
              </div>
            )}
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => handleModeSwitch('auto')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mode === 'auto'
                    ? 'bg-background shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                自动
              </button>
              <button
                onClick={() => handleModeSwitch('manual')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  mode === 'manual'
                    ? 'bg-background shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                手动
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {mode === 'manual' && (
          <div className="mb-4 space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">开始时间</label>
                <input
                  type="datetime-local"
                  value={range.since}
                  max={range.until}
                  onChange={(e) => setSince(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">结束时间</label>
                <input
                  type="datetime-local"
                  value={range.until}
                  min={range.since}
                  onChange={(e) => setUntil(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs tabular-nums ${overCap ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {overCap ? '超出上限，将截取最后 10 分钟' : `时长 ${windowMinutes} 分钟`}
              </span>
              <button
                onClick={runManualAnalysis}
                disabled={loading || windowMs <= 0}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    分析中…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                    开始分析
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        {!displayedAnalysis ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
            <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-30 fill-none stroke-current stroke-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            <span className="text-sm">
              {mode === 'manual' ? '选择时间段后点击开始分析' : '暂无 AI 分析结果'}
            </span>
          </div>
        ) : (
          <AnalysisResult analysis={displayedAnalysis} />
        )}
      </CardContent>
    </Card>
  );
}
