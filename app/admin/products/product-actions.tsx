'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProductActions({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } catch {
      alert('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-60 ${
        isActive
          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
      }`}
    >
      {isActive ? (
        <>
          <EyeOff className="w-3.5 h-3.5" />
          下架
        </>
      ) : (
        <>
          <Eye className="w-3.5 h-3.5" />
          上架
        </>
      )}
    </button>
  );
}
