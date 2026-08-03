// QAWF · 共享类型定义

/** 8 项指标 + 附加信息 */
export interface Metrics {
  hr: number | null; // 心率 BPM
  rr: number | null; // 呼吸 次/min
  spo2: number | null; // 血氧 %（实验性）
  rmssd: number | null; // HRV 时域 ms
  lfhf: number | null; // HRV 频域比
  si: number | null; // Baevsky 压力指数
  fi: number | null; // 疲劳指数（启发式 0-100）
  mwi: number | null; // 认知负荷（启发式 0-100）
  confidence: number | null; // 信赖度 0-100
  motion: number | null; // 运动伪影强度 0-100（越高越不可信）
  beats: number; // 检测到的心搏数
  waveform: number[]; // 最近脉搏波（归一化）
}

/** 主线程 → Worker 的分析请求 */
export interface AnalyzeRequest {
  type: 'analyze';
  t: number[]; // 时间戳(ms)
  r: number[];
  g: number[];
  b: number[];
  duration: number; // 累计录制时长(s)
  motion: number; // 近期运动强度 0-1（用于衰减信赖度）
  final?: boolean; // stop() 触发的收尾分析；Worker 原样回传，供主线程识别最后一次结果
}

/** Worker → 主线程的分析结果 */
export interface MetricsResponse {
  type: 'metrics';
  metrics: Metrics;
  final?: boolean;
}

/** 个人数据表单 */
export interface PersonForm {
  name: string;
  gender: string;
  birth: string;
  height: string;
  weight: string;
  note: string;
}

export const EMPTY_METRICS: Metrics = {
  hr: null, rr: null, spo2: null, rmssd: null,
  lfhf: null, si: null, fi: null, mwi: null,
  confidence: null, motion: null, beats: 0, waveform: [],
};

// ————— ROI 几何（主线程与人脸 Worker 共享） —————

/** 矩形 ROI */
export interface Roi {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** 人脸包围盒 + 采样 ROI 列表 */
export interface RoiData {
  box: Roi;
  rois: Roi[];
}

// ————— 人脸检测 Worker 消息协议（v2：Worker 内 OffscreenCanvas 检测） —————

/** 主线程 → 人脸 Worker */
export type FaceRequest =
  | { type: 'init' }
  | { type: 'frame'; bitmap: ImageBitmap; t: number } // t：相对录制起点(ms)
  | { type: 'dispose' };

/** 人脸 Worker → 主线程 */
export type FaceResponse =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | {
      type: 'sample';
      t: number;
      hasFace: boolean;
      r: number;
      g: number;
      b: number;
      roi: RoiData | null;
      motion: number; // 平滑后的运动强度 0-1
    };
