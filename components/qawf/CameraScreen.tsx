'use client';

// QAWF · 步骤 2/3：摄像头 + 录制 + 实时指标

import { useEffect, useState } from 'react';
import MetricGrid from './MetricGrid';
import type { UseMeasurement } from '@/hooks/useMeasurement';

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
            {finishing ? '正在计算…' : '■ 停止并查看结果'}
          </button>
        )}
        <button className="btn ghost" onClick={onBack}>
          返回
        </button>
      </div>
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
