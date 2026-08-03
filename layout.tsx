import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Soulmates · 面部生理指标测量',
  description: '基于面部视频 rPPG 的心率/呼吸/血氧/HRV 测量',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="topbar">
          <div className="brand">
            <img src="/logo.jpg" alt="Soulmates" className="logo" />
            <div className="brand-txt">
              <b>Soulmates</b>
              <small>rPPG 面部生理测量</small>
            </div>
          </div>
          <span className="ver">v0.3</span>
        </header>
        {children}
        <ServiceWorkerRegister />
        <footer className="foot">Soulmates · 面部生理指标测量</footer>
      </body>
    </html>
  );
}
