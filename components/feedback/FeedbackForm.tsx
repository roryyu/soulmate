'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  types: any[];
  isLoading?: boolean;
}

export default function FeedbackForm({ isOpen, onClose, onSubmit, types, isLoading = false }: FeedbackFormProps) {
  const [formData, setFormData] = useState({
    typeId: '',
    title: '',
    description: '',
    userEmail: '',
    userPhone: '',
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]); // 正在上传的文件名
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && types.length > 0) {
      setFormData(prev => ({ ...prev, typeId: types[0].id }));
    }
  }, [isOpen, types]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 添加正在上传的文件
    const fileNames = Array.from(files).map(f => f.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);

    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      // 添加 bucket 和 key 参数
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}_${randomStr}_${file.name}`;
      // 使用项目配置的 bucket，路径前缀区分反馈附件
      formData.append('bucket', process.env.NEXT_PUBLIC_TOS_BUCKET || 'edu-nexus');
      formData.append('key', `feedback-attachments/${fileName}`);

      const response = await fetch('/api/tos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const data = await response.json();
      // 从返回的数据中获取文件路径
      return data.data?.filePath || data.data?.key;
    });

    try {
      const uploadedPaths = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedPaths.filter(Boolean)]);
    } catch (error) {
      console.error('上传失败:', error);
      alert('文件上传失败，请重试');
    } finally {
      // 移除已上传的文件（无论成功失败）
      setUploadingFiles(prev => prev.filter(name => !fileNames.includes(name)));
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.typeId) newErrors.typeId = '请选择问题类型';
    if (!formData.title) newErrors.title = '请输入问题标题';
    if (!formData.description) newErrors.description = '请输入问题描述';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        ...formData,
        attachments,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">提交问题反馈</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="typeId">问题类型</Label>
              <select
                id="typeId"
                name="typeId"
                value={formData.typeId}
                onChange={handleInputChange}
                className="w-full p-2 border rounded mt-1"
              >
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.typeId && <p className="text-red-500 text-sm mt-1">{errors.typeId}</p>}
            </div>

            <div>
              <Label htmlFor="title">问题标题</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="请输入问题标题"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">问题描述</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="请详细描述您遇到的问题"
                rows={4}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <Label htmlFor="userEmail">邮箱（选填）</Label>
              <Input
                id="userEmail"
                name="userEmail"
                type="email"
                value={formData.userEmail}
                onChange={handleInputChange}
                placeholder="请输入您的邮箱"
              />
            </div>

            <div>
              <Label htmlFor="userPhone">电话（选填）</Label>
              <Input
                id="userPhone"
                name="userPhone"
                value={formData.userPhone}
                onChange={handleInputChange}
                placeholder="请输入您的电话"
              />
            </div>

            <div>
              <Label htmlFor="attachments">截图上传（选填）</Label>
              <input
                id="attachments"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingFiles.length > 0}
                className="w-full p-2 border rounded mt-1 disabled:opacity-50"
              />
              
              {/* 上传中的文件列表 */}
              {uploadingFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {uploadingFiles.map((fileName, index) => (
                    <div key={index} className="flex items-center gap-2 bg-blue-50 border border-blue-200 p-2 rounded">
                      <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-blue-700">正在上传：{fileName}</span>
                    </div>
                  ))}
                  <p className="text-xs text-blue-600">上传中，请稍候...</p>
                </div>
              )}
              
              {/* 已上传的文件列表 */}
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((path, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                      <span className="text-sm">{path.split('/').pop()}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={uploadingFiles.length > 0}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="button" onClick={onClose} className="flex-1">
                取消
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading || uploadingFiles.length > 0}
              >
                {isLoading ? '提交中...' : uploadingFiles.length > 0 ? '上传中...' : '提交'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}