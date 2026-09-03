'use client';

// QAWF · useMeasurement —— 摄像头采集 + FaceMesh ROI + 采样循环 + Worker 通信
// TF.js / FaceMesh 通过动态 import 在客户端加载（避免 SSR 访问 window）。

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection';
import {
  EMPTY_METRICS,
  type AnalyzeRequest,
  type FaceRequest,
  type FaceResponse,
  type Metrics,
  type MetricsResponse,
  type Roi,
  type RoiData,
} from '@/lib/types';
import { LOCAL_DETECTOR_MODEL_URL, LOCAL_LANDMARK_MODEL_URL } from '@/lib/face/model-urls';

const MAX_SECONDS = 180;
const DETECT_INTERVAL_MS = 100; // 主线程回退：人脸检测节流 ~10Hz
const FRAME_SEND_INTERVAL_MS = 50; // Worker 路径：帧发送节流 ~20Hz
const ANALYZE_INTERVAL_MS = 1500; // 指标刷新间隔
const MOTION_GATE = 0.12; // 运动门控阈值：超过则暂停采样入库
const FACE_WORKER_TIMEOUT_MS = 30000; // 人脸 Worker 初始化超时
const DEBUG = false; // 调试开关：打印人脸检测诊断日志

export type MeasureStatus = 'idle' | 'loading' | 'ready' | 'recording' | 'done' | 'error';

export interface UseMeasurement {
  status: MeasureStatus;
  timer: number;
  fps: number;
  metrics: Metrics;
  faceHint: string;
  error: string;
  /** 情绪签到：用户在摄像头界面选择的情绪（中文名），未选择为 null */
  emotion: string | null;
  setEmotion: (e: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayRef: React.RefObject<HTMLCanvasElement>;
  waveRef: React.RefObject<HTMLCanvasElement>;
  openCamera: () => Promise<void>;
  start: () => void;
  /** 补发一次收尾分析并等待结果；Worker 无响应时 4s 后退回最近一次结果 */
  stop: () => Promise<Metrics>;
  /** 关闭摄像头并停止采集循环（保留指标数据，供结果页展示） */
  closeCamera: () => void;
  reset: () => void;
}

export function useMeasurement(): UseMeasurement {
  const [status, setStatus] = useState<MeasureStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [fps, setFps] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({ ...EMPTY_METRICS });
  const [faceHint, setFaceHint] = useState('正在加载模型…');
  const [error, setError] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);

  const detectorRef = useRef<FaceLandmarksDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef(0);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastDetectRef = useRef(0);
  const lastRoiRef = useRef<RoiData | null>(null);
  const frameStampsRef = useRef<number[]>([]);
  const waveformRef = useRef<number[]>([]);
  const metricsRef = useRef<Metrics>({ ...EMPTY_METRICS }); // 最近一次结果（stop 的兜底值）
  const finalResolveRef = useRef<((m: Metrics) => void) | null>(null);

  // v2：人脸检测 Worker（含主线程回退）
  const faceWorkerRef = useRef<Worker | null>(null);
  const faceWorkerReadyRef = useRef(false);
  const useWorkerRef = useRef(false); // true=Worker 路径；false=主线程回退
  const lastFrameSendRef = useRef(0); // Worker 路径帧发送节流
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null); // 主线程运动估算
  const motionRef = useRef(0); // 近期运动强度 0-1
  const loopRunningRef = useRef(false); // 采集循环是否在运行（防重复启动）

  const bufRef = useRef<{ t: number[]; r: number[]; g: number[]; b: number[] }>({
    t: [], r: [], g: [], b: [],
  });

  const grabRef = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);
  const openingRef = useRef(false); // 防止 openCamera 并发/重复调用（含 StrictMode 双挂载）

  // 初始化 Worker
  useEffect(() => {
    const worker = new Worker(new URL('@/lib/rppg/rppg.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<MetricsResponse>) => {
      if (e.data.type === 'metrics') {
        const m = e.data.metrics;
        if (m.waveform && m.waveform.length) waveformRef.current = m.waveform;
        // 保留上一次有效值：RMSSD / LF/HF / SI / FI / MWI 一旦有数就不再回退到 null
        setMetrics((prev) => {
          const merged: Metrics = {
            ...m,
            rmssd: m.rmssd ?? prev.rmssd,
            lfhf: m.lfhf ?? prev.lfhf,
            si: m.si ?? prev.si,
            fi: m.fi ?? prev.fi,
            mwi: m.mwi ?? prev.mwi,
          };
          metricsRef.current = merged;
          return merged;
        });
        if (e.data.final && finalResolveRef.current) {
          finalResolveRef.current(metricsRef.current);
          finalResolveRef.current = null;
        }
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const computeROIs = (keypoints: { x: number; y: number }[]): RoiData => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of keypoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const x = minX, y = minY, w = maxX - minX, h = maxY - minY;
    return {
      box: { x, y, w, h },
      rois: [
        { x: x + 0.3 * w, y: y + 0.05 * h, w: 0.4 * w, h: 0.13 * h }, // 前额
        { x: x + 0.15 * w, y: y + 0.55 * h, w: 0.18 * w, h: 0.15 * h }, // 左颊
        { x: x + 0.67 * w, y: y + 0.55 * h, w: 0.18 * w, h: 0.15 * h }, // 右颊
      ],
    };
  };

  const roiMean = (rois: Roi[]): { r: number; g: number; b: number } | null => {
    const grab = grabRef.current;
    if (!grab) return null;
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (const roi of rois) {
      const rx = Math.max(0, Math.floor(roi.x));
      const ry = Math.max(0, Math.floor(roi.y));
      const rw = Math.min(grab.canvas.width - rx, Math.floor(roi.w));
      const rh = Math.min(grab.canvas.height - ry, Math.floor(roi.h));
      if (rw <= 0 || rh <= 0) continue;
      const img = grab.ctx.getImageData(rx, ry, rw, rh).data;
      for (let i = 0; i < img.length; i += 8) {
        sr += img[i]; sg += img[i + 1]; sb += img[i + 2]; n++;
      }
    }
    if (n === 0) return null;
    return { r: sr / n, g: sg / n, b: sb / n };
  };

  const drawOverlay = (roiData: RoiData | null) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!roiData) return;
    ctx.strokeStyle = 'rgba(80,220,120,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(roiData.box.x, roiData.box.y, roiData.box.w, roiData.box.h);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(80,220,120,.5)';
    for (const roi of roiData.rois) ctx.strokeRect(roi.x, roi.y, roi.w, roi.h);
  };

  const drawWave = () => {
    const c = waveRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = (c.width = c.clientWidth);
    const h = (c.height = c.clientHeight);
    ctx.clearRect(0, 0, w, h);
    const data = waveformRef.current;
    if (!data || data.length < 2) return;
    let min = Infinity, max = -Infinity;
    for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = '#37d0a8';
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * (h * 0.8) - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  /** 采样入库（滑窗裁剪），主线程路径与 Worker 路径共用 */
  const pushSample = (t: number, r: number, g: number, b: number) => {
    const buf = bufRef.current;
    buf.t.push(t); buf.r.push(r); buf.g.push(g); buf.b.push(b);
    const cutoff = t - MAX_SECONDS * 1000;
    while (buf.t.length && buf.t[0] < cutoff) {
      buf.t.shift(); buf.r.shift(); buf.g.shift(); buf.b.shift();
    }
  };

  /** 处理人脸 Worker 回传的采样：更新运动、叠加框、门控入库 */
  const onFaceSample = (d: Extract<FaceResponse, { type: 'sample' }>) => {
    motionRef.current = d.motion;
    drawOverlay(d.roi);
    if (!d.hasFace) {
      setFaceHint('未检测到人脸，请对准画面');
      return;
    }
    if (d.motion > MOTION_GATE) {
      setFaceHint('运动过大，请保持静止');
      return;
    }
    setFaceHint('已检测到人脸 · 保持静止');
    if (runningRef.current) pushSample(d.t, d.r, d.g, d.b);
  };

  /** 启动人脸 Worker 并等待就绪；失败/超时则 reject（由调用方回退主线程） */
  const initFaceWorker = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (faceWorkerReadyRef.current && faceWorkerRef.current) {
        resolve();
        return;
      }
      const worker = new Worker(new URL('@/lib/face/face.worker.ts', import.meta.url));
      faceWorkerRef.current = worker;
      const timer = setTimeout(
        () => reject(new Error('人脸 Worker 初始化超时')),
        FACE_WORKER_TIMEOUT_MS,
      );
      worker.onmessage = (e: MessageEvent<FaceResponse>) => {
        const d = e.data;
        if (d.type === 'ready') {
          faceWorkerReadyRef.current = true;
          clearTimeout(timer);
          resolve();
        } else if (d.type === 'error') {
          if (!faceWorkerReadyRef.current) {
            clearTimeout(timer);
            reject(new Error(d.message));
          } else if (DEBUG) {
            console.error('[faceWorker] error:', d.message);
          }
        } else if (d.type === 'sample') {
          onFaceSample(d);
        }
      };
      worker.onerror = (ev) => {
        if (!faceWorkerReadyRef.current) {
          clearTimeout(timer);
          reject(new Error(ev.message || '人脸 Worker 运行错误'));
        }
      };
      const msg: FaceRequest = { type: 'init' };
      worker.postMessage(msg);
    });

  /** 主线程回退：动态加载 TF.js + FaceMesh（本地打包，模型权重首次联网下载） */
  const loadMainDetector = async (): Promise<void> => {
    if (detectorRef.current) return;
    const tf = await import('@tensorflow/tfjs-core');
    await import('@tensorflow/tfjs-backend-webgl');
    const fld = await import('@tensorflow-models/face-landmarks-detection');
    await tf.setBackend('webgl');
    await tf.ready();
    if (DEBUG) console.log('[face] TF backend =', tf.getBackend());
    detectorRef.current = await fld.createDetector(fld.SupportedModels.MediaPipeFaceMesh, {
      runtime: 'tfjs',
      refineLandmarks: false,
      maxFaces: 1,
      // 同域本地权重，杜绝远程加载（tfhub/kaggle/googleapis 可能不可达）
      detectorModelUrl: LOCAL_DETECTOR_MODEL_URL,
      landmarkModelUrl: LOCAL_LANDMARK_MODEL_URL,
    });
    if (DEBUG) console.log('[face] detector created OK');
  };

  const loop = useCallback(async () => {
    if (!loopRunningRef.current) return;
    const video = videoRef.current;
    const now = performance.now();
    const relT = runningRef.current ? now - startTimeRef.current : now;

    if (video && video.readyState >= 2) {
      if (useWorkerRef.current && faceWorkerReadyRef.current && faceWorkerRef.current) {
        // Worker 路径：节流抓帧，转移 ImageBitmap 所有权给 Worker 检测
        if (now - lastFrameSendRef.current > FRAME_SEND_INTERVAL_MS) {
          lastFrameSendRef.current = now;
          try {
            const bitmap = await createImageBitmap(video);
            const msg: FaceRequest = { type: 'frame', bitmap, t: relT };
            faceWorkerRef.current.postMessage(msg, [bitmap]);
          } catch {
            /* 抓帧失败，跳过本帧 */
          }
        }
      } else {
        // 主线程回退路径
        const grab = grabRef.current;
        if (grab) {
          grab.ctx.drawImage(video, 0, 0, grab.canvas.width, grab.canvas.height);
          if (now - lastDetectRef.current > DETECT_INTERVAL_MS && detectorRef.current) {
            lastDetectRef.current = now;
            try {
              // 在已绘制好视频帧的 2D 画布上检测：规避部分 macOS/Chrome 下
              // WebGL 直接读取 <video> 纹理得到黑帧、导致检测不到人脸的问题。
              const faces = await detectorRef.current.estimateFaces(grab.canvas, { flipHorizontal: false });
              if (faces && faces.length) {
                const roi = computeROIs(faces[0].keypoints);
                lastRoiRef.current = roi;
                // 由包围盒中心位移估算运动强度（EMA 平滑）
                const cx = roi.box.x + roi.box.w / 2;
                const cy = roi.box.y + roi.box.h / 2;
                const diag = Math.hypot(roi.box.w, roi.box.h) || 1;
                if (lastCenterRef.current) {
                  const inst = Math.hypot(cx - lastCenterRef.current.x, cy - lastCenterRef.current.y) / diag;
                  motionRef.current = 0.7 * motionRef.current + 0.3 * inst;
                }
                lastCenterRef.current = { x: cx, y: cy };
                drawOverlay(roi);
              } else {
                lastRoiRef.current = null;
                lastCenterRef.current = null;
                motionRef.current = 1;
                drawOverlay(null);
                setFaceHint('未检测到人脸，请对准画面');
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (DEBUG) console.error('[face] estimateFaces 抛错：', err);
              setFaceHint('人脸检测出错：' + msg);
            }
          }

          if (lastRoiRef.current) {
            const m = roiMean(lastRoiRef.current.rois);
            if (m) {
              if (motionRef.current > MOTION_GATE) {
                setFaceHint('运动过大，请保持静止');
              } else {
                setFaceHint('已检测到人脸 · 保持静止');
                if (runningRef.current) pushSample(relT, m.r, m.g, m.b);
              }
            }
          }
        }
      }
    }

    const stamps = frameStampsRef.current;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    setFps(stamps.length);
    if (runningRef.current) setTimer((now - startTimeRef.current) / 1000);
    drawWave();

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /** 启动采集循环（预览态即开始，用于人脸提示/叠框；防重复启动） */
  const startLoop = () => {
    if (loopRunningRef.current) return;
    loopRunningRef.current = true;
    frameStampsRef.current = [];
    loop();
  };

  const openCamera = useCallback(async () => {
    // 已在初始化中或已就绪则跳过（StrictMode 会双调用本函数）
    if (openingRef.current || streamRef.current) return;
    openingRef.current = true;
    setStatus('loading');
    setError('');
    try {
      const video = videoRef.current;
      if (!video) throw new Error('video 未就绪');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      // play() 返回 Promise，若被新的 load 打断会抛 AbortError，属良性可忽略
      try {
        await video.play();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // 播放请求被打断（如快速重挂载），忽略
        } else {
          throw err;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('无法创建画布上下文');
      grabRef.current = { canvas, ctx };

      try {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        const settings = (track.getSettings ? track.getSettings() : {}) as any;
        const adv: MediaTrackConstraintSet[] = [];
        // 只在能拿到当前曝光时长时才锁定曝光：部分手机只设 exposureMode:'manual'
        // 却不给 exposureTime，会把画面锁在最暗曝光，导致“环境很亮但画面很暗”。
        if ((caps as any).exposureMode?.includes?.('manual') && settings.exposureTime) {
          adv.push({ exposureMode: 'manual', exposureTime: settings.exposureTime } as any);
        }
        // 白平衡同理：仅在有当前色温值时锁定，否则保持自动，避免色温/亮度异常。
        if ((caps as any).whiteBalanceMode?.includes?.('manual') && settings.colorTemperature) {
          adv.push({ whiteBalanceMode: 'manual', colorTemperature: settings.colorTemperature } as any);
        }
        if (adv.length) await track.applyConstraints({ advanced: adv });
      } catch {
        /* 部分设备不支持锁定曝光 */
      }

      // 优先在 Worker 内运行 FaceMesh（OffscreenCanvas + createImageBitmap）；
      // 环境不支持或初始化失败/超时则回退到已验证可用的主线程检测。
      setFaceHint('正在加载人脸模型…');
      const canUseWorker =
        typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';
      if (canUseWorker) {
        try {
          await initFaceWorker();
          useWorkerRef.current = true;
          if (DEBUG) console.log('[face] worker ready');
        } catch (err) {
          console.warn('[face] Worker 初始化失败，回退主线程：', err);
          faceWorkerRef.current?.terminate();
          faceWorkerRef.current = null;
          faceWorkerReadyRef.current = false;
          useWorkerRef.current = false;
          await loadMainDetector();
        }
      } else {
        await loadMainDetector();
      }
      setFaceHint('模型就绪，请点击"开始录制"');
      setStatus('ready');
      startLoop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setFaceHint('初始化失败：' + msg);
      setStatus('error');
    } finally {
      openingRef.current = false;
    }
  }, []);

  const start = useCallback(() => {
    if (!faceWorkerReadyRef.current && !detectorRef.current) return;
    bufRef.current = { t: [], r: [], g: [], b: [] };
    waveformRef.current = [];
    runningRef.current = true;
    startTimeRef.current = performance.now();
    lastDetectRef.current = 0;
    lastCenterRef.current = null;
    motionRef.current = 0;
    setMetrics({ ...EMPTY_METRICS });
    setStatus('recording');

    analyzeTimerRef.current = setInterval(() => {
      if (!runningRef.current || bufRef.current.t.length < 64 || !workerRef.current) return;
      const buf = bufRef.current;
      const req: AnalyzeRequest = {
        type: 'analyze',
        t: buf.t.slice(), r: buf.r.slice(), g: buf.g.slice(), b: buf.b.slice(),
        duration: (performance.now() - startTimeRef.current) / 1000,
        motion: motionRef.current,
      };
      workerRef.current.postMessage(req);
    }, ANALYZE_INTERVAL_MS);
  }, []);

  /**
   * 结束录制，但保留采集循环用于持续预览/叠框；计时冻结。
   * 会补发一次收尾分析并等待结果：否则结果页拿到的是停止前最多滞后 2s 的快照，
   * 且刚跨过时长门控（如 120s 的 LF/HF）的指标可能永远不出数。
   */
  const stop = useCallback((): Promise<Metrics> => {
    runningRef.current = false;
    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    setStatus('done');

    const buf = bufRef.current;
    const worker = workerRef.current;
    if (!worker || buf.t.length < 64) return Promise.resolve(metricsRef.current);

    return new Promise<Metrics>((resolve) => {
      // 兜底：Worker 无响应时不阻塞跳转，退回最近一次结果
      const timer = setTimeout(() => {
        finalResolveRef.current = null;
        resolve(metricsRef.current);
      }, 4000);
      finalResolveRef.current = (m) => {
        clearTimeout(timer);
        resolve(m);
      };
      const req: AnalyzeRequest = {
        type: 'analyze',
        t: buf.t.slice(), r: buf.r.slice(), g: buf.g.slice(), b: buf.b.slice(),
        duration: (performance.now() - startTimeRef.current) / 1000,
        motion: motionRef.current,
        final: true,
      };
      worker.postMessage(req);
    });
  }, []);

  /**
   * 关闭摄像头并停止采集循环（在 stop 拿到最终指标后调用）。
   * 保留 metrics/timer 等状态供结果页展示；硬件资源全部释放。
   */
  const closeCamera = useCallback(() => {
    runningRef.current = false;
    loopRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (faceWorkerRef.current) {
      const msg: FaceRequest = { type: 'dispose' };
      faceWorkerRef.current.postMessage(msg);
      faceWorkerRef.current.terminate();
      faceWorkerRef.current = null;
    }
    faceWorkerReadyRef.current = false;
    useWorkerRef.current = false;
    grabRef.current = null;
    setFps(0);
  }, []);

  const reset = useCallback(() => {
    closeCamera();
    detectorRef.current = null;
    lastCenterRef.current = null;
    motionRef.current = 0;
    openingRef.current = false;
    setStatus('idle');
    setTimer(0);
    setMetrics({ ...EMPTY_METRICS });
    setFaceHint('正在加载模型…');
    setEmotion(null);
  }, [closeCamera]);

  // 卸载清理
  useEffect(() => () => {
    runningRef.current = false;
    loopRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    faceWorkerRef.current?.terminate();
  }, []);

  return {
    status, timer, fps, metrics, faceHint, error, emotion, setEmotion,
    videoRef, overlayRef, waveRef,
    openCamera, start, stop, closeCamera, reset,
  };
}
