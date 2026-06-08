'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, File, X, Loader2 } from 'lucide-react';
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
      <div className="border border-[#dddddd] rounded-[14px] p-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            file
              ? 'border-[#222222] bg-[#f7f7f7]'
              : 'border-[#dddddd] hover:border-[#222222] hover:bg-[#f7f7f7]'
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
              <div className="w-10 h-10 rounded-lg bg-[#f7f7f7] flex items-center justify-center">
                <File className="w-5 h-5 text-[#222222]" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-medium text-[#222222]">{file.name}</p>
                <p className="text-[13px] text-[#6a6a6a]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="ml-4 p-2 rounded-lg hover:bg-[#f2f2f2] text-[#6a6a6a] hover:text-[#222222] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label htmlFor="file-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-[#929292] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#222222]">点击或拖拽文件到此处上传</p>
              <p className="text-[13px] text-[#6a6a6a] mt-1">支持任意文件类型</p>
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[14px]">
          {error}
        </div>
      )}

      {uploadProgress && !error && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-[14px]">
          {uploadProgress}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/admin/toc-data"
          className="h-12 px-6 rounded-lg border border-[#dddddd] text-[14px] font-medium text-[#222222] hover:border-[#222222] transition-colors inline-flex items-center gap-2"
        >
          返回
        </Link>
        <button
          type="submit"
          disabled={loading || !file}
          className="flex-1 h-12 rounded-lg bg-[#ff385c] text-white text-[14px] font-medium hover:bg-[#e00b41] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
