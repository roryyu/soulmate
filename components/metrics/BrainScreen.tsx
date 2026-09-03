'use client';

// METRICS · 步骤 5：脑机接口演示界面
// 五种脑波（Delta/Theta/Alpha/Beta/Gamma）canvas 动画 + 30 秒采集倒计时
// 波形为模拟数据，仅用于流程演示

import { useEffect, useRef, useState } from 'react';

/** 五种脑波的可视化参数（频率/幅度为演示用视觉参数，非真实信号） */
const WAVES = [
  { key: 'delta', label: 'Delta 波', range: '0.5–4 Hz', freq: 0.5, amp: 1 },
  { key: 'theta', label: 'Theta 波', range: '4–8 Hz', freq: 1.1, amp: 0.8 },
  { key: 'alpha', label: 'Alpha 波', range: '8–13 Hz', freq: 2.2, amp: 0.62 },
  { key: 'beta', label: 'Beta 波', range: '13–30 Hz', freq: 4, amp: 0.42 },
  { key: 'gamma', label: 'Gamma 波', range: '>30 Hz', freq: 7, amp: 0.28 },
] as const;

type Phase = 'idle' | 'running' | 'done';

export default function BrainScreen({ onFinish }: { onFinish: () => void }) {
  /** idle=未开始 / running=采集中（30s 倒计时）/ done=可完成 */
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(30);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // 30 秒倒计时：running 且 left>0 时每秒递减，归零后进入 done
  useEffect(() => {
    if (phase !== 'running') return;
    if (left <= 0) {
      setPhase('done');
      return;
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, left]);

  // 五种脑波动画：requestAnimationFrame 逐帧绘制正弦叠加波形
  useEffect(() => {
    if (phase === 'idle') return;
    let raf = 0;
    let t = 0;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      t += 1;
      WAVES.forEach((w, i) => {
        const cv = canvasRefs.current[i];
        const ctx = cv?.getContext('2d');
        if (!cv || !ctx) return;
        const cw = cv.clientWidth;
        const ch = cv.clientHeight;
        // 按容器尺寸与设备像素比校准画布分辨率
        if (cv.width !== Math.round(cw * dpr)) {
          cv.width = Math.round(cw * dpr);
          cv.height = Math.round(ch * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        // 中线
        ctx.strokeStyle = 'rgba(61, 184, 160, .16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ch / 2);
        ctx.lineTo(cw, ch / 2);
        ctx.stroke();

        // 波形：主频正弦 + 二次谐波，随 t 相位推进
        ctx.strokeStyle = '#37d0a8';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = 'rgba(55, 208, 168, .55)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let x = 0; x <= cw; x += 2) {
          const p = x / cw;
          const y =
            ch / 2 +
            Math.sin(p * Math.PI * 2 * w.freq * 4 + t * 0.055 * w.freq) * (ch * 0.34) * w.amp +
            Math.sin(p * Math.PI * 2 * w.freq * 9 + t * 0.1 * w.freq) * (ch * 0.11) * w.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const running = phase === 'running';

  return (
    <section className="card">
      <h2 className="sec-title">脑机接口</h2>

      <div className="brain-box">
        {phase === 'idle' ? (
          <div className="brain-standby">EEG · STANDBY — 佩戴设备后开始采集</div>
        ) : (
          <>
            <div className="brain-head">
              <span className={`brain-status${running ? ' on' : ''}`}>
                {running ? 'RECORDING…' : 'RECORD DONE'}
              </span>
              <span className="brain-count">
                <b>{String(left).padStart(2, '0')}</b>
                <small>s</small>
              </span>
            </div>
            {WAVES.map((w, i) => (
              <div className="brain-row" key={w.key}>
                <div className="brain-label">
                  {i + 1} · {w.label}
                  <small>{w.range}</small>
                </div>
                <canvas
                  ref={(el) => {
                    canvasRefs.current[i] = el;
                  }}
                  className="brain-wave"
                />
              </div>
            ))}
          </>
        )}
      </div>

      <button
        className="btn primary"
        disabled={running}
        onClick={() => (phase === 'idle' ? setPhase('running') : onFinish())}
      >
        {phase === 'idle'
          ? '佩戴脑机接口设备开始测试'
          : running
            ? `完成测试（剩余 ${left}s）`
            : '完成测试'}
      </button>
    </section>
  );
}
