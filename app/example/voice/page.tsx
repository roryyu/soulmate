'use client';

import { useState, useRef, useCallback } from 'react';

export default function VoiceTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    lang: string;
    emotion: string;
    event: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风: ' + (err as Error).message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (isRecording) {
      // 停止处理器
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      // 停止音频上下文
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // 停止麦克风
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      setIsRecording(false);
      
      // 合并并发送音频
      if (chunksRef.current.length > 0) {
        const totalLength = chunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunksRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        
        const wavBlob = encodeWAV(merged, 16000);
        sendAudio(wavBlob);
      }
    }
  }, [isRecording]);

  const sendAudio = async (blob: Blob) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');

      const response = await fetch('/api/example/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('识别失败');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        text: data.text || '',
        lang: data.lang || '',
        emotion: data.emotion || '',
        event: data.event || '',
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">语音识别测试</h1>
        
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
                ? 'bg-red-500 scale-110 shadow-lg' 
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
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  文本
                </label>
                <p className="text-lg p-3 bg-gray-50 rounded">
                  {result.text || '无内容'}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    语种
                  </label>
                  <p className="p-3 bg-blue-50 rounded text-center">
                    {result.lang || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    情绪
                  </label>
                  <p className="p-3 bg-green-50 rounded text-center">
                    {result.emotion || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    事件
                  </label>
                  <p className="p-3 bg-purple-50 rounded text-center">
                    {result.event || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 text-center text-gray-500">
          <p>请按住按钮说话，松开后自动识别</p>
        </div>
      </div>
    </div>
  );
}
