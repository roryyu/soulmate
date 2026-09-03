'use client';

// METRICS · 步骤 3：声纹测试（点击开始录音，再次点击结束并识别）
// 功能自 app/example/voice/page.tsx 移植，接口共用 /api/example/voice

import { useCallback, useEffect, useRef, useState } from 'react';

export default function VoiceScreen({
  onBack,
  onNext,
  onResult,
}: {
  onBack: () => void;
  onNext: () => void;
  /** 识别结果同步给外层（无结果时为 null） */
  onResult: (result: string | null) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null); // null=检查中
  const [elapsed, setElapsed] = useState(0);

  // 识别结果变化时同步给外层（初始/清空时同步 null）
  useEffect(() => {
    onResult(result);
  }, [result, onResult]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 检查麦克风权限
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const st = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (!cancelled) setHasPermission(st.state === 'granted');
          st.onchange = () => setHasPermission(st.state === 'granted');
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          if (!cancelled) setHasPermission(true);
        }
      } catch {
        if (!cancelled) setHasPermission(false);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  // 卸载时停止录音并释放麦克风
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudio(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err) {
      setError('无法访问麦克风: ' + (err as Error).message);
      setHasPermission(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      const duration = Date.now() - startTimeRef.current;
      if (duration < 500) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setError('录音时间太短，请至少录制 0.5 秒');
        return;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // 单击切换：开始 / 结束录音
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  async function sendAudio(blob: Blob) {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/example/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '识别失败');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data.text || '无识别结果');
    } catch (err) {
      let message = (err as Error).message;
      if (message.includes('empty') || message.includes('Empty')) {
        message = '录音内容为空，请开始录音并说话后再结束';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2 className="sec-title">声纹测试</h2>
      <p className="voice-desc">点击按钮开始录音，讲述一句最想说给身边人的话</p>

      <div className="voice-rec">
        <button
          type="button"
          className={`voice-btn${isRecording ? ' rec' : ''}`}
          disabled={loading || hasPermission === false}
          title={hasPermission === false ? '请先授予麦克风权限' : ''}
          onClick={hasPermission ? toggleRecording : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        </button>
        <div className="voice-status">
          {hasPermission === false
            ? '麦克风权限未授予'
            : hasPermission === null
              ? '正在检查权限…'
              : loading
                ? '识别中…'
                : isRecording
                  ? '点击结束录音'
                  : '点击开始录音'}
        </div>
        {(isRecording || elapsed > 0) && (
          <div className="voice-time">
            <b>{elapsed.toFixed(1)}</b>
            <small>s</small>
          </div>
        )}
      </div>

      {hasPermission === false && (
        <p className="disclaimer">麦克风权限未授予：请在浏览器设置中允许访问麦克风，然后刷新页面重试。</p>
      )}
      {error && <p className="disclaimer">{error}</p>}

      {result && (
        <div className="voice-result">
          <div className="emotion-label">测试完成</div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn primary" onClick={onNext} disabled={isRecording || loading}>
          下一步：量表测试 →
        </button>
      </div>
    </section>
  );
}
