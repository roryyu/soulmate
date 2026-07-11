'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Upload, Download } from 'lucide-react';

const EVALUATION_TYPES = [
  { value: '金', label: '金' },
  { value: '木', label: '木' },
  { value: '水', label: '水' },
  { value: '火', label: '火' },
  { value: '土', label: '土' },
];

interface OptionItem {
  text: string;
  score: number;
}

export default function EvaluationSettingPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    type: '',
    question: '',
    weight: '1.00',
    order: 0,
  });
  const [options, setOptions] = useState<OptionItem[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/evaluationsetting');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      console.error('加载评价设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addOption = () => {
    setOptions([...options, { text: '', score: 0 }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: 'text' | 'score', value: string | number) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: field === 'score' ? Number(value) : value,
    };
    setOptions(newOptions);
  };

  const handleAddSetting = async () => {
    try {
      if (!formData.question) {
        alert('请输入评价问题');
        return;
      }

      const validOptions = options.filter(opt => opt.text.trim());
      
      const response = await fetch('/api/admin/evaluationsetting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          options: validOptions.length > 0 ? JSON.stringify(validOptions) : null,
        }),
      });

      if (response.ok) {
        loadSettings();
        resetForm();
      }
    } catch (error) {
      console.error('创建评价设置失败:', error);
    }
  };

  const handleUpdateSetting = async () => {
    try {
      if (!editingSetting || !formData.question) {
        alert('请输入评价问题');
        return;
      }

      const validOptions = options.filter(opt => opt.text.trim());

      const response = await fetch('/api/admin/evaluationsetting', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingSetting.id,
          ...formData,
          options: validOptions.length > 0 ? JSON.stringify(validOptions) : null,
        }),
      });

      if (response.ok) {
        loadSettings();
        resetForm();
      }
    } catch (error) {
      console.error('更新评价设置失败:', error);
    }
  };

  const handleDeleteSetting = async (id: string) => {
    if (confirm('确定要删除这个评价设置吗？')) {
      try {
        const response = await fetch(`/api/admin/evaluationsetting?id=${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          loadSettings();
        } else {
          const errorData = await response.json();
          alert(errorData.error || '删除失败');
        }
      } catch (error) {
        console.error('删除评价设置失败:', error);
      }
    }
  };

  const handleEditSetting = (setting: any) => {
    setEditingSetting(setting);
    setFormData({
      type: setting.type || '',
      question: setting.question || '',
      weight: setting.weight?.toString() || '1.00',
      order: setting.order || 0,
    });
    
    if (setting.options) {
      try {
        const parsedOptions = JSON.parse(setting.options);
        if (Array.isArray(parsedOptions)) {
          setOptions(parsedOptions);
        } else {
          setOptions([]);
        }
      } catch {
        setOptions([]);
      }
    } else {
      setOptions([]);
    }
  };

  const resetForm = () => {
    setEditingSetting(null);
    setFormData({ type: '', question: '', weight: '1.00', order: 0 });
    setOptions([]);
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        alert('JSON 格式错误：必须是数组格式');
        return;
      }

      // 验证数据格式
      for (const item of data) {
        if (!item.question) {
          alert('每条数据必须包含 question 字段');
          return;
        }
        if (item.options && !Array.isArray(item.options)) {
          alert('options 必须是数组格式');
          return;
        }
      }

      // 调用批量导入接口
      const response = await fetch('/api/admin/evaluationsetting', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: data }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`成功导入 ${result.count} 条评价设置`);
        loadSettings();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '导入失败');
      }
    } catch (error) {
      console.error('解析 JSON 文件失败:', error);
      alert('JSON 文件格式错误，请检查文件内容');
    } finally {
      setIsUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 下载示例 JSON 模板
  const downloadTemplate = () => {
    const template = [
      {
        type: '金',
        question: '题目1',
        options: [
          { text: '选项1', score: 5 },
          { text: '选项2', score: 3 },
        ],
        weight: 1.0,
        order: 1,
      },
      {
        type: '木',
        question: '题目2',
        options: [
          { text: '选项1', score: 3 },
          { text: '选项2', score: 3 },
        ],
        weight: 1.0,
        order: 1,
      },
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evaluation-settings-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    const found = EVALUATION_TYPES.find(t => t.value === type);
    return found ? found.label : type || '-';
  };

  const formatOptions = (optionsStr: string | null) => {
    if (!optionsStr) return '-';
    try {
      const parsed = JSON.parse(optionsStr);
      if (Array.isArray(parsed)) {
        return parsed.map((opt: any) => `${opt.text}(${opt.score}分)`).join(', ');
      }
      return '-';
    } catch {
      return '-';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">评价设置管理</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-1" />
            下载模板
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? '上传中...' : '批量导入'}
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">{editingSetting ? '编辑评价设置' : '添加评价设置'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="type">评价类型</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="weight">权重</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              placeholder="1.00"
            />
          </div>

          <div>
            <Label htmlFor="order">排序</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="md:col-span-4">
            <Label htmlFor="question">评价问题</Label>
            <Input
              id="question"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="请输入评价问题"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-2">
              <Label>选项配置（留空则为评分模式）</Label>
              <Button type="button" size="sm" variant="outline" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" />
                添加选项
              </Button>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="选项内容"
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="分数"
                      value={option.score}
                      onChange={(e) => updateOption(index, 'score', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {options.length === 0 && (
                <div className="text-sm text-gray-500 py-2 text-center border border-dashed rounded">
                  暂无选项，点击上方按钮添加
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-4 flex gap-2">
            {editingSetting ? (
              <>
                <Button onClick={handleUpdateSetting}>
                  保存
                </Button>
                <Button onClick={resetForm}>
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={handleAddSetting}>
                添加评价设置
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">评价设置列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left">类型</th>
                <th className="py-2 px-4 text-left">问题</th>
                <th className="py-2 px-4 text-left">选项</th>
                <th className="py-2 px-4 text-left">权重</th>
                <th className="py-2 px-4 text-left">排序</th>
                <th className="py-2 px-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {settings.map(setting => (
                <tr key={setting.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{getTypeLabel(setting.type)}</td>
                  <td className="py-2 px-4 max-w-xs truncate">{setting.question}</td>
                  <td className="py-2 px-4 max-w-xs truncate">
                    {formatOptions(setting.options)}
                  </td>
                  <td className="py-2 px-4">{setting.weight}</td>
                  <td className="py-2 px-4">{setting.order}</td>
                  <td className="py-2 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditSetting(setting)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteSetting(setting.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
