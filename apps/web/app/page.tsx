'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomHistory } from '@/hooks/use-room-history';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { history, addRoom, removeRoom } = useRoomHistory();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const roomId = Number(input.trim());
    if (!Number.isInteger(roomId) || roomId <= 0) {
      setError('请输入有效的直播间号（正整数）');
      return;
    }
    addRoom(roomId);
    router.push(`/rooms/${roomId}`);
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--bili-pink))] to-[hsl(var(--bili-blue))] shadow-lg">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.374.56.374.933v2.134c0 .373-.125.684-.374.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.374-.56-.374-.933v-2.134c0-.373.125-.684.374-.933.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.374.56.374.933v2.134c0 .373-.125.684-.374.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.374-.56-.374-.933v-2.134c0-.373.125-.684.374-.933.249-.249.56-.373.933-.373z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Bilibili 直播监控</h1>
            <p className="text-sm text-muted-foreground mt-1">输入直播间号开始监控</p>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="直播间号，如 12345"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); }}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              进入
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </form>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">历史记录</p>
            <ul className="space-y-1">
              {history.map((roomId) => (
                <li key={roomId} className="flex items-center group">
                  <Link
                    href={`/rooms/${roomId}`}
                    className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-sm"
                    onClick={() => addRoom(roomId)}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <span className="tabular-nums font-medium">{roomId}</span>
                  </Link>
                  <button
                    onClick={() => removeRoom(roomId)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    title="从历史记录中移除"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
