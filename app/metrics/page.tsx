'use client';

// METRICS · 主页面：数据 → 摄像头/录制 → 量表 → 结果 状态机

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import FormScreen from '@/components/metrics/FormScreen';
import CameraScreen from '@/components/metrics/CameraScreen';
import ResultScreen from '@/components/metrics/ResultScreen';
import VoiceScreen from '@/components/metrics/VoiceScreen';
import BrainScreen from '@/components/metrics/BrainScreen';
import { useMeasurement } from '@/hooks/useMeasurement';
import type { ResultPacket } from '@/components/metrics/linjian/lib';
import { musicMap } from '@/components/metrics/linjian/lib';
import type { Metrics, PersonForm } from '@/lib/types';

/* 量表测试（林间音乐会）按需加载，嵌入 .wrap 容器，SSR 关闭 */
const MetricScreen = dynamic(
  () => import('@/components/metrics/linjian/ForestConcertApp'),
  { ssr: false, loading: () => <div className="metric-loading">正在进入量表测试…</div> }
);

type Screen = 'form' | 'camera' | 'voice'|'metric'|'brain' | 'result';

const STEPS = [
  { n: 1, label: '基础' },
  { n: 2, label: '面部' },
  { n: 3, label: '声纹' },
  { n: 4, label: '量表' },
  { n: 5, label: '脑机接口' },
  { n: 6, label: '结果' },
];
const STEP_OF: Record<Screen, number> = { form: 1, camera: 2, voice: 3, metric: 4, brain: 5, result: 6 };

export default function MetricsPage() {
  const [screen, setScreen] = useState<Screen>('form');
  const [form, setForm] = useState<PersonForm | null>(null);
  const [finalMetrics, setFinalMetrics] = useState<Metrics | null>(null);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);
  const [metricPacket, setMetricPacket] = useState<ResultPacket | null>(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const durationRef = useRef(0);
  const m = useMeasurement();

  const goCamera = (f: PersonForm) => {
    setForm(f);
    setScreen('camera');
  };

  const handleCameraStop = async () => {
    durationRef.current = m.timer;
    // 等收尾分析返回，避免结果页/上报用到停止前的旧快照；
    // 收尾分析只用已采集的样本，无需摄像头，立即关闭硬件
    const finalPromise = m.stop();
    m.closeCamera();
    const final = await finalPromise;
    console.log('final', final,m.emotion);
    setFinalMetrics(final);
    setEmotion(m.emotion);
    setScreen('voice');
  };

  const restart = () => {
    m.reset();
    setFinalMetrics(null);
    setVoiceResult(null);
    setMetricPacket(null);
    setMusicUrl('');
    setMusicLoading(false);
    setScreen('form');
  };

  /** 量表完成：保存答题数据包，进入脑机接口步骤（结果页乐曲后续由脑机步骤生成） */
  const handleMetricDone = (packet: ResultPacket | null) => {
    setMetricPacket(packet);
    setScreen('brain');
  };
  const handleResultDone=()=>{
    
    const final: Metrics | null =finalMetrics;
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
    //自选情绪
    let eid='0030';
    if(emotion){
      if(emotion=='愤怒'){
        eid='0026';
      }
      if(emotion=='悲伤'){
        eid=['0027','0028'][randomIndex()];
      }
      if(emotion=='焦虑'){
        eid='0029';
      }
      if(emotion=='麻木'){
        eid=['0031','0032'][randomIndex()];
      }
    }
    //量表
    const volumes = metricPacket
      ? [metricPacket.vol1, metricPacket.vol2, metricPacket.vol3, metricPacket.vol4, metricPacket.vol5]
      : [0, 0, 0, 0, 0]
    const maxTrack = volumes.indexOf(Math.max(...volumes))
    const trackIndex=maxTrack+1;
    const mmid=musicMap[trackIndex][randomIndex()]
    let mid = '';
    if(final && final.si && final.si>70){
      let mm=['0003','0004'][randomIndex()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
    }
    if(final && final.beats>80){
      let mm=['0001','0002'][randomIndex()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
    }
    if(mid==''){
      let mm=['0005','0005','0007','0008'][randomIndex2()];
      mid=`${mm}-0000-${mmid}-${eid}-${tid}`;
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
    setScreen('result');
  }
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
        {screen === 'camera' && <CameraScreen m={m} onFinish={handleCameraStop} onBack={restart} />}
        {screen === 'voice' && (
          <VoiceScreen
            onBack={restart}
            onResult={setVoiceResult}
            /* 脑机(brain)界面完成后，改为 setScreen('brain') 走完整流程 */
            onNext={() => setScreen('metric')}
          />
        )}
        {screen === 'metric' && <MetricScreen onNext={handleMetricDone} />}
        {screen === 'brain' && <BrainScreen onFinish={handleResultDone} />}
        {screen === 'result' && (
          <ResultScreen
            metrics={finalMetrics ?? m.metrics}
            form={form}
            duration={durationRef.current}
            packet={metricPacket}
            musicUrl={musicUrl}
            musicLoading={musicLoading}
            onRestart={restart}
          />
        )}
      </main>
    </>
  );
}
