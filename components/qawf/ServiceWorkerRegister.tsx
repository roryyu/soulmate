'use client';

// QAWF · Service Worker 注册（v2）
// 仅在浏览器且生产/安全上下文注册；缓存 TF.js 模型权重实现二次离线可用。
// 注册失败不影响主流程（rPPG 仍可联网加载模型）。

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[sw] 注册失败（不影响使用）：', err);
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
