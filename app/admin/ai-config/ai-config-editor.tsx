'use client';

import { useState } from 'react';
import { Save, ToggleLeft, ToggleRight } from 'lucide-react';

interface AIConfigEditorProps {
  config: {
    operationType: string;
    creditCost: number;
    description: string | null;
    isActive: boolean;
    exists: boolean;
  };
}

// 操作类型中文名映射
const OP_LABEL: Record<string, string> = {
  IDEATION: '选题生成',
  SEARCH: '检索式生成',
  ANALYZE: '文献分析',
  CHAT: '文献问答',
  WRITING: '研究写作',
  POLISHING: '论文润色',
  OUTLINE: '综述大纲',
  OCR_UPLOAD: 'PDF 文献 OCR',
};

/** 积分输入框文案：OCR 为「每 100 页一档」单价 */
const OP_CREDIT_INPUT_LABEL: Record<string, string> = {
  OCR_UPLOAD: '每100页(档)',
};

export default function AIConfigEditor({ config }: AIConfigEditorProps) {
  const [creditCost, setCreditCost] = useState(config.creditCost);
  const [isActive, setIsActive] = useState(config.isActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/ai-config/${config.operationType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditCost, isActive }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        isActive ? 'border-slate-700 bg-slate-800/30' : 'border-slate-800 bg-slate-900/20 opacity-60'
      }`}
    >
      {/* 操作名称 */}
      <div className="w-28 flex-shrink-0">
        <div className="text-white font-medium text-sm">{OP_LABEL[config.operationType] ?? config.operationType}</div>
        <div className="text-slate-500 text-xs mt-0.5 font-mono">{config.operationType}</div>
      </div>

      {/* 描述 */}
      <div className="flex-1 text-slate-400 text-sm hidden md:block">
        {config.description}
      </div>

      {/* 积分消耗输入 */}
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-xs whitespace-nowrap">
          {OP_CREDIT_INPUT_LABEL[config.operationType] ?? '消耗积分'}
        </label>
        <input
          type="number"
          min="0"
          value={creditCost}
          onChange={(e) => setCreditCost(parseInt(e.target.value) || 0)}
          className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* 启用/停用 */}
      <button
        onClick={() => setIsActive(!isActive)}
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          isActive ? 'text-emerald-400' : 'text-slate-500'
        }`}
        title={isActive ? '点击停用' : '点击启用'}
      >
        {isActive ? (
          <ToggleRight className="w-5 h-5" />
        ) : (
          <ToggleLeft className="w-5 h-5" />
        )}
        <span className="hidden sm:block">{isActive ? '已启用' : '已停用'}</span>
      </button>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60 ${
          saved
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? '...' : saved ? '已保存' : '保存'}
      </button>
    </div>
  );
}
