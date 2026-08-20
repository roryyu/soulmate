'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, Play, Pause } from 'lucide-react';

export default function TocDataDownload({ tocDataId, fileName }: { tocDataId: string; fileName: string }) {
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMp3 = fileName.toLowerCase().endsWith('.mp3');

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/toc-data/${tocDataId}/download`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '下载失败');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('下载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/admin/toc-data/${tocDataId}/stream`);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
      audioRef.current.addEventListener('error', () => {
        alert('音频播放失败');
        setIsPlaying(false);
      });
    }

    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="flex items-center gap-1">
      {isMp3 && (
        <button
          onClick={handlePlay}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            isPlaying
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              暂停
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              播放
            </>
          )}
        </button>
      )}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 text-xs font-medium transition-colors disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        下载
      </button>
    </div>
  );
}
