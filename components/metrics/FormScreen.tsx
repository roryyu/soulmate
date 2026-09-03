'use client';

// METRICS · 步骤 1：个人数据表单

import { useState } from 'react';
import type { PersonForm } from '@/lib/types';

export default function FormScreen({ onNext }: { onNext: (form: PersonForm) => void }) {
  const [form, setForm] = useState<PersonForm>({
    name: '', gender: '男', birth: '', height: '', weight: '', note: '',
  });

  const update = (k: keyof PersonForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = () => {
    if (!form.name.trim()) {
      alert('请填写姓名');
      return;
    }
    onNext(form);
  };

  return (
    <section className="card">
      <h2 className="sec-title">个人数据</h2>
      <div className="grid2">
        <label>
          <span>姓名 <span className="req">*</span></span>
          <input type="text" placeholder="请输入姓名" value={form.name} onChange={update('name')} />
        </label>
        <label>
          性别
          <select value={form.gender} onChange={update('gender')}>
            <option>男</option>
            <option>女</option>
          </select>
        </label>
        <label>
          出生年月
          <input type="date" value={form.birth} onChange={update('birth')} />
        </label>
        <label>
          身高 (CM)
          <input type="number" placeholder="170" value={form.height} onChange={update('height')} />
        </label>
        <label>
          体重 (KG)
          <input type="number" placeholder="65" value={form.weight} onChange={update('weight')} />
        </label>
        <label className="full">
          备注
          <input type="text" placeholder="药物使用、既往病史等…" value={form.note} onChange={update('note')} />
        </label>
      </div>
      <button className="btn primary" onClick={submit}>
        下一步：面部测试 →
      </button>

      <div className="tips">
        <h3>注意事项</h3>
        <ul>
          <li>请在<b>明亮且均匀</b>的光线下测量（自然光或日光灯为佳）</li>
          <li>测量期间<b>保持静止</b>，避免说话或大幅移动</li>
          <li>将脸部对齐画面中的框内，距摄像头约 30–60cm</li>
          <li>建议录制 <b>120 秒</b>以获得较准确的 HRV/压力/疲劳结果</li>
        </ul>
        <p className="disclaimer">
          ⚠️ 本系统为健康参考工具，<b>非医疗器械，不用于疾病诊断</b>。
        </p>
      </div>
    </section>
  );
}
