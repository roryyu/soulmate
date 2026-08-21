'use client';

import { useState, useRef, useCallback } from 'react';

export default function VoiceTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordStartTime, setRecordStartTime] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudio(blob);
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordStartTime(Date.now());
    } catch (err) {
      setError('无法访问麦克风: ' + (err as Error).message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      const duration = Date.now() - recordStartTime;
      if (duration < 500) {
        // 录音时间太短，直接忽略
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setError('录音时间太短，请按住至少0.5秒再松开');
        return;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording, recordStartTime]);

  const sendAudio = async (blob: Blob) => {
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
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.text || '无识别结果');
    } catch (err) {
      let message = (err as Error).message;
      if (message.includes('empty') || message.includes('Empty')) {
        message = '录音内容为空，请按住按钮说话后再松开';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">语音识别测试</h1>
        <p className="text-center text-gray-500 mb-8">使用 qwen3-asr-flash 模型</p>
        
        {/* 录音按钮 */}
        <div className="flex justify-center mb-8">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={loading}
            className={`
              w-32 h-32 rounded-full text-white font-bold text-lg
              transition-all duration-200 select-none
              ${isRecording 
                ? 'bg-red-500 scale-110 shadow-lg animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {loading ? '识别中...' : isRecording ? '松开结束' : '按住说话'}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 识别结果 */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">识别结果</h2>
            <pre className="text-lg p-4 bg-gray-50 rounded overflow-auto whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(result), null, 2);
                } catch {
                  return result;
                }
              })()}
            </pre>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 text-center text-gray-500">
          <p>按住按钮说话，松开后自动识别</p>
        </div>
      </div>
    </div>
  );
}
