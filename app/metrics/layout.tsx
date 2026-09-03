import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import ServiceWorkerRegister from '@/components/metrics/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'SOULMATES 有屿',
  description: '心有所屿，千人千愈',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// 嵌套 layout：不能再渲染 <html>/<body>（根 layout 已提供），否则 hydration 失败
export default function MetricsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/logo.jpg" alt="Soulmates" className="logo" />
          <div className="brand-txt">
            <b>SOULMATES 有屿</b>
            <small>心有所屿，千人千愈</small>
          </div>
        </div>
        <span className="ver">v0.3</span>
      </header>
      {children}
      <ServiceWorkerRegister />
      <footer className="foot">SOULMATES 有屿 · 心有所屿，千人千愈</footer>
    </>
  );
}
