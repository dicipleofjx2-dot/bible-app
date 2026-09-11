import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import ServiceWorker from '@/components/ServiceWorker';

export const metadata: Metadata = {
  title: '영적기록ON',
  description: '꿈·환상·예언·감동을 음성으로 남기면 정리하고 분류해 보관합니다.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '영적기록ON', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#8a5a3b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <main>
          <nav className="nav row">
            <Link href="/">홈</Link>
            <Link href="/archive">기록 보관함</Link>
            <Link href="/settings">설정</Link>
          </nav>
          {children}
        </main>
        <ServiceWorker />
      </body>
    </html>
  );
}
