'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, File, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TocDataForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('请选择要上传的文件');
      return;
    }

    setLoading(true);
    setError('');
    setUploadProgress('正在上传文件...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/toc-data', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '上传失败');
        return;
      }

      setUploadProgress('上传成功！');
      setTimeout(() => {
        router.push('/admin/toc-data');
        router.refresh();
      }, 1000);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            file
              ? 'border-sky-400 bg-sky-50/50'
              : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />

          {file ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
                <File className="w-6 h-6 text-sky-600" />
              </div>
              <div className="text-left">
                <p className="text-slate-900 font-medium">{file.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="ml-4 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="cursor-pointer block"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">点击或拖拽文件到此处上传</p>
              <p className="text-sm text-slate-400 mt-1">支持任意文件类型</p>
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {uploadProgress && !error && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm">
          {uploadProgress}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/admin/toc-data"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
        <button
          type="submit"
          disabled={loading || !file}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              上传文件
            </>
          )}
        </button>
      </div>
    </form>
  );
}
