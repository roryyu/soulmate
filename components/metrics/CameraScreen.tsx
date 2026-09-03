'use client';

// METRICS · 步骤 2/3：摄像头 + 录制 + 实时指标

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import MetricGrid from './MetricGrid';
import type { UseMeasurement } from '@/hooks/useMeasurement';

// 情绪签到选项（语义色遵循 UI 规范 2.2）
function EmotionIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      {children}
    </svg>
  );
}

const EMOTIONS: { key: string; name: string; icon: ReactNode }[] = [
  { key: 'anger', name: '愤怒', icon: <EmotionIcon><path d="M7.5 9.2l2.6 1" /><path d="M16.5 9.2l-2.6 1" /><path d="M9.2 11h.01" /><path d="M14.8 11h.01" /><path d="M9 16c.8-1.1 1.9-1.7 3-1.7s2.2.6 3 1.7" /></EmotionIcon> },
  { key: 'sad', name: '悲伤', icon: <EmotionIcon><path d="M9.2 11h.01" /><path d="M14.8 11h.01" /><path d="M9 16c.8-1.1 1.9-1.7 3-1.7s2.2.6 3 1.7" /></EmotionIcon> },
  { key: 'anxious', name: '焦虑', icon: <EmotionIcon><path d="M9.2 11h.01" /><path d="M14.8 11h.01" /><path d="M8.5 15.2c1.2-1.1 2.3-1.1 3.5 0s2.3 1.1 3.5 0" /></EmotionIcon> },
  { key: 'happy', name: '快乐', icon: <EmotionIcon><path d="M9.2 11h.01" /><path d="M14.8 11h.01" /><path d="M8.5 13.8c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" /></EmotionIcon> },
  { key: 'numb', name: '麻木', icon: <EmotionIcon><path d="M8.5 10.5h1.8" /><path d="M13.7 10.5h1.8" /><path d="M9 15.5h6" /></EmotionIcon> },
];

export default function CameraScreen({
  m,
  onFinish,
  onBack,
}: {
  m: UseMeasurement;
  /** 停止录制：由上层等待收尾分析后再切到结果页 */
  onFinish: () => Promise<void>;
  onBack: () => void;
}) {
  const [finishing, setFinishing] = useState(false);
  // 进入界面后自动打开摄像头（仅一次）
  useEffect(() => {
    if (m.status === 'idle') void m.openCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recording = m.status === 'recording';

  return (
    <section className="card">
      <div className="video-box">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={m.videoRef} playsInline muted />
        <canvas ref={m.overlayRef} className="overlay" />
        <div className="face-hint">{m.faceHint}</div>
      </div>

      <div className="rec-head">
        <div className={`rec-status${recording ? ' on' : ''}`}>
          {recording ? '录制中…' : m.status === 'ready' ? '就绪' : m.status === 'loading' ? '加载中…' : '—'}
        </div>
        <div className="timer">
          <b>{m.timer.toFixed(1)}</b>
          <small>s</small> <span className="heart">❤</span>
        </div>
      </div>
      <div className="btn-row">
        {!recording ? (
          <button className="btn primary" onClick={m.start} disabled={m.status !== 'ready'}>
            ● 开始录制
          </button>
        ) : (
          <button
            className="btn primary"
            disabled={finishing}
            onClick={() => {
              setFinishing(true);
              void onFinish();
            }}
          >
            {finishing ? '正在计算…' : '■ 完成面部测试，进入声纹测试'}
          </button>
        )}
      </div>
      {m.status != 'loading' && (
        <div className="emotion-card">
          <div className="emotion-label">当前情绪</div>
          <div className="emotion-q">此刻，你的感受是？</div>
          <div className="emotion-row">
            {EMOTIONS.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`emotion-item em-${e.key}${m.emotion === e.name ? ' sel' : ''}`}
                onClick={() => m.setEmotion(e.name)}
              >
                <span className="emotion-icon">{e.icon}</span>
                <span className="emotion-name">{e.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <canvas ref={m.waveRef} className="wave" />

      <div className="live-line">
        即时估算 · <span>{m.metrics.beats}</span> BEATS · 信赖度{' '}
        <b>{m.metrics.confidence == null ? '--' : m.metrics.confidence.toFixed(0)}</b>% · 运动{' '}
        <b>{m.metrics.motion == null ? '--' : m.metrics.motion.toFixed(0)}</b>% · <span>{m.fps}</span> FPS
      </div>

      <MetricGrid metrics={m.metrics} />
      <p className="note">※ 每 2 秒更新 · 录制越长数值越准确。SpO2 / FI / MWI 为实验性参考值。</p>



      {m.error && <p className="disclaimer">初始化错误：{m.error}</p>}
    </section>
  );
}
