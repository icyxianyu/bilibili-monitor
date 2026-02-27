'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface RoomSidebarProps {
  history: number[];
  onRemove?: (roomId: number) => void;
}

export function RoomSidebar({ history, onRemove }: RoomSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">历史房间</span>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2">暂无历史记录</p>
      ) : (
        <ul className="space-y-0.5">
          {history.map((roomId) => {
            const href = `/rooms/${roomId}`;
            const isActive = pathname === href;
            return (
              <li key={roomId} className="flex items-center group">
                <Link
                  href={href}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span className="tabular-nums">{roomId}</span>
                </Link>
                {onRemove && (
                  <button
                    onClick={() => onRemove(roomId)}
                    className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-muted-foreground hover:text-foreground transition-all"
                    title="从历史记录中移除"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 px-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          监控新房间
        </Link>
      </div>
    </aside>
  );
}
