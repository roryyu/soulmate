// QAWF · 人脸检测 Worker（v2）
// 在 Worker 内用 OffscreenCanvas + TF.js(WebGL) 运行 FaceMesh：
//   接收主线程传来的 ImageBitmap 帧 → 检测人脸 → 计算 ROI → 采样 ROI 的 RGB 均值
//   → 估算运动强度 → 回传采样结果。把重活移出主线程，保证采集流畅。
// 由 Next.js/webpack 本地打包，无远程脚本；模型权重首次联网下载（可被 Service Worker 缓存离线化）。

import type { FaceLandmarksDetector, Keypoint } from '@tensorflow-models/face-landmarks-detection';
import type { FaceRequest, FaceResponse, Roi, RoiData } from '../types';
import { LOCAL_DETECTOR_MODEL_URL, LOCAL_LANDMARK_MODEL_URL } from './model-urls';

const ctx = self as unknown as Worker;
const DETECT_INTERVAL_MS = 100; // 人脸检测节流 ~10Hz

let detector: FaceLandmarksDetector | null = null;
let canvas: OffscreenCanvas | null = null;
let c2d: OffscreenCanvasRenderingContext2D | null = null;
let lastDetect = 0;
let lastRoi: RoiData | null = null;
let lastCenter: { x: number; y: number } | null = null;
let motionEma = 0; // 平滑后的运动强度 0-1

const post = (m: FaceResponse) => ctx.postMessage(m);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 由 468 关键点求包围盒并按比例取 ROI（与主线程回退路径保持一致） */
function computeROIs(keypoints: Keypoint[]): RoiData {
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
}

/** 在 OffscreenCanvas 上采样各 ROI 内像素 RGB 均值 */
function roiMean(rois: Roi[]): { r: number; g: number; b: number } | null {
  if (!canvas || !c2d) return null;
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (const roi of rois) {
    const rx = Math.max(0, Math.floor(roi.x));
    const ry = Math.max(0, Math.floor(roi.y));
    const rw = Math.min(canvas.width - rx, Math.floor(roi.w));
    const rh = Math.min(canvas.height - ry, Math.floor(roi.h));
    if (rw <= 0 || rh <= 0) continue;
    const img = c2d.getImageData(rx, ry, rw, rh).data;
    for (let i = 0; i < img.length; i += 8) {
      sr += img[i]; sg += img[i + 1]; sb += img[i + 2]; n++;
    }
  }
  if (n === 0) return null;
  return { r: sr / n, g: sg / n, b: sb / n };
}

async function init(): Promise<void> {
  const tf = await import('@tensorflow/tfjs-core');
  await import('@tensorflow/tfjs-backend-webgl');
  const fld = await import('@tensorflow-models/face-landmarks-detection');
  await tf.setBackend('webgl');
  await tf.ready();
  detector = await fld.createDetector(fld.SupportedModels.MediaPipeFaceMesh, {
    runtime: 'tfjs',
    refineLandmarks: false,
    maxFaces: 1,
    // 同域本地权重，杜绝远程加载（tfhub/kaggle/googleapis 可能不可达）
    detectorModelUrl: LOCAL_DETECTOR_MODEL_URL,
    landmarkModelUrl: LOCAL_LANDMARK_MODEL_URL,
  });
  post({ type: 'ready' });
}

async function onFrame(bitmap: ImageBitmap, t: number): Promise<void> {
  if (!detector) {
    bitmap.close();
    return;
  }
  const w = bitmap.width;
  const h = bitmap.height;
  if (!canvas || canvas.width !== w || canvas.height !== h) {
    canvas = new OffscreenCanvas(w, h);
    c2d = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!c2d) {
    bitmap.close();
    return;
  }
  c2d.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const rt = performance.now();
  if (rt - lastDetect > DETECT_INTERVAL_MS) {
    lastDetect = rt;
    try {
      // OffscreenCanvas 作为检测输入（可靠的纹理上传路径，规避 <video> 黑帧问题）
      const faces = await detector.estimateFaces(
        canvas as unknown as HTMLCanvasElement,
        { flipHorizontal: false },
      );
      if (faces && faces.length) {
        lastRoi = computeROIs(faces[0].keypoints);
        const cx = lastRoi.box.x + lastRoi.box.w / 2;
        const cy = lastRoi.box.y + lastRoi.box.h / 2;
        const diag = Math.hypot(lastRoi.box.w, lastRoi.box.h) || 1;
        if (lastCenter) {
          const inst = Math.hypot(cx - lastCenter.x, cy - lastCenter.y) / diag;
          motionEma = 0.7 * motionEma + 0.3 * inst; // 指数滑动平均平滑
        }
        lastCenter = { x: cx, y: cy };
      } else {
        lastRoi = null;
        lastCenter = null;
      }
    } catch (e) {
      post({ type: 'error', message: errMsg(e) });
    }
  }

  const hasFace = !!lastRoi;
  const m = hasFace ? roiMean(lastRoi!.rois) : null;
  post({
    type: 'sample',
    t,
    hasFace: hasFace && !!m,
    r: m?.r ?? 0,
    g: m?.g ?? 0,
    b: m?.b ?? 0,
    roi: lastRoi,
    motion: hasFace ? motionEma : 1,
  });
}

ctx.onmessage = async (e: MessageEvent<FaceRequest>) => {
  const d = e.data;
  if (!d) return;
  if (d.type === 'init') {
    try {
      await init();
    } catch (err) {
      post({ type: 'error', message: errMsg(err) });
    }
    return;
  }
  if (d.type === 'frame') {
    await onFrame(d.bitmap, d.t);
    return;
  }
  if (d.type === 'dispose') {
    detector?.dispose?.();
    detector = null;
    canvas = null;
    c2d = null;
  }
};
