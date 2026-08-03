'use client';

// QAWF · 主页面：数据 → 摄像头/录制 → 结果 状态机

import { useRef, useState } from 'react';
import FormScreen from '@/components/FormScreen';
import CameraScreen from '@/components/CameraScreen';
import ResultScreen from '@/components/ResultScreen';
import { useMeasurement } from '@/hooks/useMeasurement';
import type { Metrics, PersonForm } from '@/lib/types';

type Screen = 'form' | 'camera' | 'result';

const STEPS = [
  { n: 1, label: '数据' },
  { n: 2, label: '摄影机' },
  { n: 3, label: '录制' },
  { n: 4, label: '结果' },
];
const STEP_OF: Record<Screen, number> = { form: 1, camera: 3, result: 4 };

export default function Home() {
  const [screen, setScreen] = useState<Screen>('form');
  const [form, setForm] = useState<PersonForm | null>(null);
  const [finalMetrics, setFinalMetrics] = useState<Metrics | null>(null);
  const durationRef = useRef(0);
  const m = useMeasurement();

  const goCamera = (f: PersonForm) => {
    setForm(f);
    setScreen('camera');
  };

  const handleStop = async () => {
    durationRef.current = m.timer;
    // 等收尾分析返回，避免结果页/上报用到停止前的旧快照
    const final = await m.stop();
    setFinalMetrics(final);
    setScreen('result');
    // 上传指标 JSON（不含视频）
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, metrics: final, ts: Date.now() }),
    }).catch(() => {});
  };

  const restart = () => {
    m.reset();
    setFinalMetrics(null);
    setScreen('form');
  };

  const step = STEP_OF[screen];

  return (
    <>
      <nav className="steps">
        {STEPS.map((s) => (
          <div className={`step${s.n <= step ? ' active' : ''}`} key={s.n}>
            <i>{s.n}</i>
            <span>{s.label}</span>
          </div>
        ))}
      </nav>

      <main className="wrap">
        {screen === 'form' && <FormScreen onNext={goCamera} />}
        {screen === 'camera' && <CameraScreen m={m} onFinish={handleStop} onBack={restart} />}
        {screen === 'result' && (
          <ResultScreen
            metrics={finalMetrics ?? m.metrics}
            form={form}
            duration={durationRef.current}
            onRestart={restart}
          />
        )}
      </main>
    </>
  );
}
