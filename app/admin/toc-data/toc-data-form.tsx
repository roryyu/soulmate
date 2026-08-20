'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';

/** 上传单个文件到 /api/admin/toc-data（服务端存 TOS 并 AI 生成标签） */
async function uploadSingleFile(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/admin/toc-data', { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? '上传失败');
  }
}

/** 递归遍历拖拽条目，收集文件夹内所有文件 */
async function collectFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries 单次最多返回部分结果，需循环读取直到为空
    const readAllEntries = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => {
        const acc: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries(
            (batch) => {
              if (batch.length === 0) resolve(acc);
              else {
                acc.push(...batch);
                readBatch();
              }
            },
            () => resolve(acc)
          );
        };
        readBatch();
      });
    const children = await readAllEntries();
    const files: File[] = [];
    for (const child of children) {
      files.push(...(await collectFilesFromEntry(child)));
    }
    return files;
  }
  return [];
}

/** 从 drop 事件收集文件：优先按文件夹结构遍历，回退为 files 列表 */
async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items || [])
    .map((item) =>
      typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
    )
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length > 0) {
    const files: File[] = [];
    for (const entry of entries) {
      files.push(...(await collectFilesFromEntry(entry)));
    }
    return files;
  }
  return Array.from(dataTransfer.files || []);
}

interface TocDataFormProps {
  onUploaded?: () => void;
}

export default function TocDataForm({ onUploaded }: TocDataFormProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}__${f.size}`));
      const merged = [...prev];
      for (const f of incoming) {
        const key = `${f.name}__${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      return merged;
    });
  }, []);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = await collectDroppedFiles(e.dataTransfer);
    if (dropped.length === 0) {
      setError('未检测到可上传的文件');
      return;
    }
    setError('');
    addFiles(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('请选择或拖拽要上传的文件');
      return;
    }

    setIsLoading(true);
    setError('');

    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(
        `正在上传 ${i + 1}/${files.length}：${file.name}，AI 正在自动生成标签...`
      );
      try {
        await uploadSingleFile(file);
      } catch (err) {
        console.error('Failed to upload file:', err);
        failed.push(file.name);
      }
    }

    setIsLoading(false);
    setUploadProgress('');

    if (failed.length > 0) {
      setError(`以下文件上传失败：${failed.join('、')}`);
      setFiles(files.filter((f) => failed.includes(f.name)));
      return;
    }

    setFiles([]);
    if (onUploaded) {
      onUploaded();
    } else {
      router.push('/admin/toc-data');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="file">文件</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[#222222] bg-[#f7f7f7]'
              : 'border-[#dddddd] hover:border-[#222222]'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-[#929292]" />
          <p className="text-[14px] text-[#222222]">点击选择文件，或将文件/文件夹拖拽到此处</p>
          <p className="text-[12px] text-[#929292] mt-1">
            拖拽文件夹将自动上传其中所有文件（含子文件夹）
          </p>
          <Input
            id="file"
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <li
                key={`${file.name}__${file.size}__${index}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#ebebeb] bg-white text-[13px] text-[#222222]"
              >
                <span className="break-all">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={isLoading}
                  className="shrink-0 text-[#929292] hover:text-[#222222] disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-[14px] text-red-600 break-all">{error}</p>}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-lg text-[15px]"
          onClick={() => router.push('/admin/toc-data')}
          disabled={isLoading}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isLoading || files.length === 0}
          className="flex-1 h-12 bg-[#222222] hover:bg-black rounded-lg text-[15px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploadProgress}
            </>
          ) : (
            `上传${files.length > 0 ? ` ${files.length} 个文件` : ''}`
          )}
        </Button>
      </div>
    </form>
  );
}
