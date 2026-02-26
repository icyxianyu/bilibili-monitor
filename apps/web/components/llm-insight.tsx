'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { LlmAnalysisEvent } from '@bilibili-monitor/shared';

interface LlmInsightProps {
  analysis: LlmAnalysisEvent | null;
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

export function LlmInsight({ analysis }: LlmInsightProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI 分析洞察</CardTitle>
          {analysis && (
            <Badge variant={sentimentVariant[analysis.sentiment]}>
              {sentimentLabel[analysis.sentiment] ?? analysis.sentiment}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <p className="text-muted-foreground text-sm">暂无 AI 分析结果</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
            {analysis.significantChange && analysis.changeDescription && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-xs font-medium text-yellow-800">剧情变化</p>
                <p className="text-sm text-yellow-700 mt-1">{analysis.changeDescription}</p>
              </div>
            )}
            {analysis.topKeywords.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">热词</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.topKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              更新于 {new Date(analysis.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
