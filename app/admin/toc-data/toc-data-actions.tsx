'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TocDataActions({ tocDataId }: { tocDataId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('确定要删除这条记录吗？')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/toc-data/${tocDataId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '删除失败');
        return;
      }
      router.refresh();
    } catch {
      alert('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-60"
    >
      <Trash2 className="w-3.5 h-3.5" />
      删除
    </button>
  );
}
