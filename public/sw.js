/* QAWF · Service Worker（v2.1 · 离线化）
 * 模型权重已同域托管于 /models/（由 `npm run fetch-models` 预下载），不再远程加载。
 * 策略：对同域 /models/ 做 cache-first，install 时预缓存 model.json；二次访问离线可用。
 * 仅拦截模型/权重类请求，不干预页面导航与 /api。
 */

const CACHE_NAME = 'qawf-model-cache-v2';

// install 预缓存的模型清单（权重分片首次 fetch 时按 cache-first 落缓存）
const PRECACHE = [
  '/models/face-detection-short/model.json',
  '/models/face-mesh/model.json',
];

// 兜底：历史/异常情况下仍可能出现的远程模型源（正常流程不会命中）
const REMOTE_MODEL_HOSTS = ['storage.googleapis.com', 'www.gstatic.com', 'tfhub.dev', 'www.kaggle.com'];

const isLocalModel = (u) => u.origin === self.location.origin && u.pathname.startsWith('/models/');
const isRemoteModel = (u) =>
  REMOTE_MODEL_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));

const shouldHandle = (url) => {
  try {
    const u = new URL(url);
    return isLocalModel(u) || isRemoteModel(u);
  } catch {
    return false;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 预缓存 model.json；文件缺失（未运行 fetch-models）时忽略失败，不阻塞安装
      await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!shouldHandle(req.url)) return; // 只接管模型/权重请求

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached; // cache-first：命中直接返回，离线亦可用
      try {
        const resp = await fetch(req);
        if (resp && (resp.ok || resp.type === 'opaque')) {
          cache.put(req, resp.clone());
        }
        return resp;
      } catch (e) {
        const fallback = await cache.match(req);
        if (fallback) return fallback;
        throw e;
      }
    })(),
  );
});
