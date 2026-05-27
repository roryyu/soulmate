'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    type: string;
    duration: number | null;
    credits: number | null;
    isActive: boolean;
    sortOrder: number;
  };
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    // 中文注释：原价可选，留空表示前台不展示划线价
    originalPrice:
      product?.originalPrice != null ? String(product.originalPrice) : '',
    type: product?.type ?? 'MEMBERSHIP',
    duration: product?.duration?.toString() ?? '',
    credits: product?.credits?.toString() ?? '',
    isActive: product?.isActive ?? true,
    sortOrder: product?.sortOrder?.toString() ?? '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/admin/products/${product!.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          originalPrice:
            form.originalPrice.trim() === '' ? null : parseFloat(form.originalPrice),
          type: form.type,
          duration: form.duration ? parseInt(form.duration) : null,
          credits: form.credits ? parseInt(form.credits) : null,
          isActive: form.isActive,
          sortOrder: parseInt(form.sortOrder),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '操作失败');
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm';
  const labelClass = 'block text-slate-300 text-sm font-medium mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>产品名称 *</label>
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：月度会员、100积分包" required />
      </div>

      <div>
        <label className={labelClass}>产品描述</label>
        <textarea className={`${inputClass} resize-none`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简短描述（可选）" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>早鸟价（实付，元）*</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className={labelClass}>原价（元，可选）</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.originalPrice}
            onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
            placeholder="留空则前台不显示划线价"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>产品类型 *</label>
        <select
          className={inputClass}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="MEMBERSHIP">会员套餐</option>
          <option value="CREDIT_PACKAGE">积分包</option>
          <option value="SINGLE_PURCHASE">单次购买</option>
        </select>
      </div>

      {/* 会员套餐专属：有效期 */}
      {form.type === 'MEMBERSHIP' && (
        <div>
          <label className={labelClass}>有效期（天）*</label>
          <input type="number" min="1" className={inputClass} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="30 / 90 / 365" required={form.type === 'MEMBERSHIP'} />
        </div>
      )}

      {/* 积分包专属：积分数量 */}
      {form.type === 'CREDIT_PACKAGE' && (
        <div>
          <label className={labelClass}>赠送积分数量 *</label>
          <input type="number" min="1" className={inputClass} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="100 / 500 / 1000" required={form.type === 'CREDIT_PACKAGE'} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>排序（数字越小越靠前）</label>
          <input type="number" className={inputClass} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-slate-300 text-sm">立即上架</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href="/admin/products"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {loading ? '保存中...' : '保存产品'}
        </button>
      </div>
    </form>
  );
}
