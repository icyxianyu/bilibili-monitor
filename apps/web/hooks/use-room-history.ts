'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'roomHistory';
const MAX_HISTORY = 20;

function readHistory(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as number[];
  } catch {
    // ignore
  }
  return [];
}

function writeHistory(history: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function useRoomHistory() {
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const addRoom = useCallback((roomId: number) => {
    // Always read fresh from localStorage to avoid stale closure
    const current = readHistory();
    const next = [roomId, ...current.filter((id) => id !== roomId)].slice(0, MAX_HISTORY);
    writeHistory(next);
    setHistory(next);
  }, []);

  const removeRoom = useCallback((roomId: number) => {
    const current = readHistory();
    const next = current.filter((id) => id !== roomId);
    writeHistory(next);
    setHistory(next);
  }, []);

  return { history, addRoom, removeRoom };
}
