'use client';

import { useEffect, useRef, useState } from 'react';
import type { MonitorEvent } from '@bilibili-monitor/shared';

type SseData =
  | MonitorEvent
  | { type: 'connected' }
  | { type: 'danmaku'; uid: number; username: string; content: string; timestamp: number };

interface UseSseOptions {
  onEvent?: (data: SseData) => void;
}

export function useSse(url: string, options?: UseSseOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SseData | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SseData;
        setLastEvent(data);
        onEventRef.current?.(data);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url]);

  return { connected, lastEvent };
}
