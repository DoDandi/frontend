import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

// 피그마 기준 글꼴. 빌드할 때 받아 이 사이트에서 직접 주고, 한글은 쓰는 글자 묶음만 받는다
const noto = Noto_Sans_KR({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-noto' });

export const metadata: Metadata = {
  title: '열기단디도',
  description: '대구 원도심, 지금 살아 있는 현장을 온도로',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={noto.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
