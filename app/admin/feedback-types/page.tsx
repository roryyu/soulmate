'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function FeedbackTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sortOrder: 0,
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/feedback-types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data.types || []);
      }
    } catch (error) {
      console.error('加载反馈类型失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddType = async () => {
    try {
      if (!formData.name) {
        alert('请输入类型名称');
        return;
      }

      const response = await fetch('/api/admin/feedback-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        loadTypes();
        setFormData({ name: '', description: '', sortOrder: 0 });
      }
    } catch (error) {
      console.error('创建反馈类型失败:', error);
    }
  };

  const handleUpdateType = async () => {
    try {
      if (!editingType || !formData.name) {
        alert('请输入类型名称');
        return;
      }

      const response = await fetch('/api/admin/feedback-types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingType.id,
          ...formData,
        }),
      });

      if (response.ok) {
        loadTypes();
        setEditingType(null);
        setFormData({ name: '', description: '', sortOrder: 0 });
      }
    } catch (error) {
      console.error('更新反馈类型失败:', error);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (confirm('确定要删除这个类型吗？')) {
      try {
        const response = await fetch(`/api/admin/feedback-types?id=${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          loadTypes();
        } else {
          const errorData = await response.json();
          alert(errorData.error || '删除失败');
        }
      } catch (error) {
        console.error('删除反馈类型失败:', error);
      }
    }
  };

  const handleEditType = (type: any) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || '',
      sortOrder: type.sortOrder || 0,
    });
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', sortOrder: 0 });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">反馈类型管理</h1>

      <Card className="p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">{editingType ? '编辑类型' : '添加类型'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name">类型名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="请输入类型名称"
            />
          </div>

          <div>
            <Label htmlFor="sortOrder">排序</Label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入类型描述"
              rows={2}
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            {editingType ? (
              <>
                <Button onClick={handleUpdateType}>
                  保存
                </Button>
                <Button onClick={handleCancelEdit}>
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={handleAddType}>
                添加类型
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">类型列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left">ID</th>
                <th className="py-2 px-4 text-left">类型名称</th>
                <th className="py-2 px-4 text-left">描述</th>
                <th className="py-2 px-4 text-left">排序</th>
                <th className="py-2 px-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {types.map(type => (
                <tr key={type.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{type.id}</td>
                  <td className="py-2 px-4">{type.name}</td>
                  <td className="py-2 px-4">{type.description || '-'}</td>
                  <td className="py-2 px-4">{type.sortOrder}</td>
                  <td className="py-2 px-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditType(type)}
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteType(type.id)}
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