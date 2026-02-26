'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface DanmakuDataPoint {
  time: string;
  count: number;
}

interface DanmakuChartProps {
  data: DanmakuDataPoint[];
}

export function DanmakuChart({ data }: DanmakuChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>弹幕热度</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            暂无弹幕数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(label) => `时间: ${label}`}
                formatter={(value: number) => [value, '弹幕数']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
