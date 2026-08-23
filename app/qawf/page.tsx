'use client';

// QAWF · 主页面：数据 → 摄像头/录制 → 结果 状态机

import { useRef, useState } from 'react';
import FormScreen from '@/components/qawf/FormScreen';
import CameraScreen from '@/components/qawf/CameraScreen';
import ResultScreen from '@/components/qawf/ResultScreen';
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
  const [musicUrl, setMusicUrl] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const durationRef = useRef(0);
  const m = useMeasurement();

  const goCamera = (f: PersonForm) => {
    setForm(f);
    setScreen('camera');
  };

  const handleStop = async () => {
    durationRef.current = m.timer;
    // 等收尾分析返回，避免结果页/上报用到停止前的旧快照；
    // 收尾分析只用已采集的样本，无需摄像头，立即关闭硬件
    const finalPromise = m.stop();
    m.closeCamera();
    const final = await finalPromise;
    setFinalMetrics(final);
    setScreen('result');
    // 上传指标 JSON（不含视频）
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, metrics: final, ts: Date.now() }),
    }).catch(() => {});
    // 播放音乐
    const randomIndex = () => Math.floor(Math.random() * 2)
    const randomIndex2 = () => Math.floor(Math.random() * 4)
    const times=[
      {id:'t1',info:'8:00-12:00'},
      {id:'t2',info:'12:00-16:00'},
      {id:'t3',info:'16:00-20:00'},
      {id:'t4',info:'20:00-8:00'},
    ]
    //获取当前时分，根据times的info，返回id
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    let tid=times[0].id

    for (const t of times) {
      const [start, end] = t.info.split('-')
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em

      if (startMin <= endMin) {
        // 不跨午夜，如 8:00-12:00
        if (currentMinutes >= startMin && currentMinutes < endMin) tid=t.id
      } else {
        // 跨午夜，如 20:00-8:00
        if (currentMinutes >= startMin || currentMinutes < endMin) tid=t.id
      }
    }
    let mid = '';
    if(final.si && final.si>70){
      let mm=['0003','0004'][randomIndex()];
      mid=`${mm}-0000-0000-0000-${tid}`;
    }
    if(final.beats && final.beats>80){
      let mm=['0001','0002'][randomIndex()];
      mid=`${mm}-0000-0000-0000-${tid}`;
    }
    if(mid==''){
      let mm=['0005','0005','0007','0008'][randomIndex2()];
      mid=`${mm}-0000-0000-0000-${tid}`;
    } 
    console.log('final',final,mid)
    // 请求音乐生成接口（入参 mid，返回 OSS 播放地址；服务端有缓存会秒回）。
    // 不阻塞结果页：生成/混音可能耗时，先展示结果，音乐就绪后再出现播放器。
    setMusicUrl('');
    setMusicLoading(true);
    fetch('/api/music-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mid }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (data?.url) setMusicUrl(data.url);
      })
      .catch(() => {})
      .finally(() => setMusicLoading(false));
  };

  const restart = () => {
    m.reset();
    setFinalMetrics(null);
    setMusicUrl('');
    setMusicLoading(false);
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
            musicUrl={musicUrl}
            musicLoading={musicLoading}
            onRestart={restart}
          />
        )}
      </main>
    </>
  );
}
