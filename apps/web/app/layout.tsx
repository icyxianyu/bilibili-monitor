import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bilibili 直播监控',
  description: '实时监控 Bilibili 直播间状态与弹幕分析',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
