import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import ServiceWorkerRegister from '@/components/qawf/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Soulmates · 面部生理指标测量',
  description: '基于面部视频的心率/呼吸/血氧/HRV 测量',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// 嵌套 layout：不能再渲染 <html>/<body>（根 layout 已提供），否则 hydration 失败
export default function QawfLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/logo.jpg" alt="Soulmates" className="logo" />
          <div className="brand-txt">
            <b>Soulmates</b>
            <small>面部生理测量</small>
          </div>
        </div>
        <span className="ver">v0.3</span>
      </header>
      {children}
      <ServiceWorkerRegister />
      <footer className="foot">Soulmates · 面部生理指标测量</footer>
    </>
  );
}
