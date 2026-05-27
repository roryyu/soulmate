'use client';

import { useState } from 'react';

type Props = {
  initialNewUserGiftCredits: number;
  /** 文献综述生成时 RAG 合并后采用的片段条数 */
  initialLiteratureReviewRagTopK: number;
  literatureReviewRagTopKMin: number;
  literatureReviewRagTopKMax: number;
};

/** 管理端：系统参数表单（可随配置项增加扩展字段） */
export default function SystemSettingsForm({
  initialNewUserGiftCredits,
  initialLiteratureReviewRagTopK,
  literatureReviewRagTopKMin,
  literatureReviewRagTopKMax,
}: Props) {
  const [newUserGiftCredits, setNewUserGiftCredits] = useState(String(initialNewUserGiftCredits));
  const [literatureReviewRagTopK, setLiteratureReviewRagTopK] = useState(
    String(initialLiteratureReviewRagTopK)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const n = parseInt(newUserGiftCredits, 10);
    const ragK = parseInt(literatureReviewRagTopK, 10);
    if (Number.isNaN(n) || !Number.isInteger(n)) {
      setMessage({ type: 'err', text: '请输入有效整数' });
      return;
    }
    if (Number.isNaN(ragK) || !Number.isInteger(ragK)) {
      setMessage({ type: 'err', text: 'RAG 片段条数须为有效整数' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUserGiftCredits: n, literatureReviewRagTopK: ragK }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data?.error || '保存失败' });
        return;
      }
      const savedGift = data?.settings?.newUserGiftCredits;
      const savedRag = data?.settings?.literatureReviewRagTopK;
      if (typeof savedGift === 'number') setNewUserGiftCredits(String(savedGift));
      if (typeof savedRag === 'number') setLiteratureReviewRagTopK(String(savedRag));
      setMessage({ type: 'ok', text: '已保存' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-5 rounded-xl border border-slate-700 bg-slate-800/30 space-y-4">
      <div>
        <label htmlFor="newUserGiftCredits" className="block text-sm font-medium text-slate-300 mb-1.5">
          新用户赠送积分
        </label>
        <p className="text-xs text-slate-500 mb-2">
          通过邮箱注册、手机号注册或管理后台创建用户时，将按此数值初始化钱包并记一条赠送流水；为 0 时不创建钱包与流水。
        </p>
        <input
          id="newUserGiftCredits"
          type="number"
          min={0}
          step={1}
          className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          value={newUserGiftCredits}
          onChange={(e) => setNewUserGiftCredits(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="literatureReviewRagTopK" className="block text-sm font-medium text-slate-300 mb-1.5">
          文献综述 RAG 片段条数
        </label>
        <p className="text-xs text-slate-500 mb-2">
          生成文献综述时，若填写了「聚焦主题」，系统会从已向量化的文献中检索相关片段；此值为每篇文献检索上限，以及合并后最终送入模型的片段条数。未配置时默认 30，范围{' '}
          {literatureReviewRagTopKMin}～{literatureReviewRagTopKMax}。
        </p>
        <input
          id="literatureReviewRagTopK"
          type="number"
          min={literatureReviewRagTopKMin}
          max={literatureReviewRagTopKMax}
          step={1}
          className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          value={literatureReviewRagTopK}
          onChange={(e) => setLiteratureReviewRagTopK(e.target.value)}
          required
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {saving ? '保存中…' : '保存'}
      </button>
    </form>
  );
}
