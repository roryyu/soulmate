'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<'feedback' | 'types'>('feedback');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  // 类型管理相关状态
  const [editingType, setEditingType] = useState<any>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypeSortOrder, setNewTypeSortOrder] = useState(0);

  useEffect(() => {
    loadTypes();
    if (activeTab === 'feedback') {
      loadFeedbacks();
    }
  }, [status, typeId, page, pageSize, activeTab]);

  const loadTypes = async () => {
    try {
      const response = await fetch('/api/admin/feedback-types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data.types || []);
      }
    } catch (error) {
      console.error('加载问题类型失败:', error);
    }
  };

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (typeId) params.append('typeId', typeId);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('加载反馈列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateStatus',
          feedbackId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        loadFeedbacks();
        if (selectedFeedback?.id === feedbackId) {
          setSelectedFeedback(null);
        }
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleReply = async (feedbackId: string, content: string) => {
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reply',
          feedbackId,
          content,
        }),
      });

      if (response.ok) {
        loadFeedbacks();
        if (selectedFeedback?.id === feedbackId) {
          const data = await response.json();
          setSelectedFeedback((prev: any) => ({
            ...prev,
            replies: [...(prev.replies || []), data.reply],
          }));
        }
      }
    } catch (error) {
      console.error('回复失败:', error);
    }
  };

  // 类型管理功能
  const handleAddType = async () => {
    if (!newTypeName) {
      alert('请输入类型名称');
      return;
    }

    try {
      const response = await fetch('/api/admin/feedback-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTypeName,
          description: newTypeDescription,
          sortOrder: newTypeSortOrder || 0,
        }),
      });

      if (response.ok) {
        alert('类型添加成功');
        setNewTypeName('');
        setNewTypeDescription('');
        setNewTypeSortOrder(0);
        loadTypes();
      } else {
        const data = await response.json();
        alert(`添加失败：${data.error}`);
      }
    } catch (error) {
      console.error('添加类型失败:', error);
      alert('添加失败，请重试');
    }
  };

  const handleEditType = (type: any) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setNewTypeDescription(type.description || '');
    setNewTypeSortOrder(type.sortOrder);
  };

  const handleUpdateType = async () => {
    if (!editingType) return;

    try {
      const response = await fetch(`/api/admin/feedback-types?id=${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTypeName,
          description: newTypeDescription,
          sortOrder: newTypeSortOrder,
        }),
      });

      if (response.ok) {
        alert('类型更新成功');
        setEditingType(null);
        setNewTypeName('');
        setNewTypeDescription('');
        setNewTypeSortOrder(0);
        loadTypes();
      } else {
        const data = await response.json();
        alert(`更新失败：${data.error}`);
      }
    } catch (error) {
      console.error('更新类型失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('确定要删除这个类型吗？')) return;

    try {
      const response = await fetch(`/api/admin/feedback-types?id=${typeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('类型删除成功');
        loadTypes();
      } else {
        const data = await response.json();
        alert(`删除失败：${data.error}`);
      }
    } catch (error) {
      console.error('删除类型失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setNewTypeName('');
    setNewTypeDescription('');
    setNewTypeSortOrder(0);
  };

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'PENDING', label: '待处理' },
    { value: 'PROCESSING', label: '处理中' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'CLOSED', label: '已关闭' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">问题反馈管理</h1>

      {/* 标签页切换 */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'feedback'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          反馈列表
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'types'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          类型管理
        </button>
      </div>

      {activeTab === 'feedback' && (
        <>
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="typeId">问题类型</Label>
                <select
                  id="typeId"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                >
                  <option value="">全部类型</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button onClick={() => loadFeedbacks()} disabled={isLoading}>
                  {isLoading ? '加载中...' : '查询'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">ID</th>
                    <th className="py-2 px-4 text-left">标题</th>
                    <th className="py-2 px-4 text-left">类型</th>
                    <th className="py-2 px-4 text-left">用户</th>
                    <th className="py-2 px-4 text-left">状态</th>
                    <th className="py-2 px-4 text-left">创建时间</th>
                    <th className="py-2 px-4 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map(feedback => (
                    <tr key={feedback.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{feedback.id}</td>
                      <td className="py-2 px-4">{feedback.title}</td>
                      <td className="py-2 px-4">{feedback.type?.name}</td>
                      <td className="py-2 px-4">{feedback.userName || '游客'}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          feedback.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          feedback.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          feedback.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {feedback.status === 'PENDING' ? '待处理' :
                           feedback.status === 'PROCESSING' ? '处理中' :
                           feedback.status === 'COMPLETED' ? '已完成' :
                           '已关闭'}
                        </span>
                      </td>
                      <td className="py-2 px-4">{new Date(feedback.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setSelectedFeedback(feedback)}
                          >
                            查看
                          </Button>
                          {feedback.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(feedback.id, 'PROCESSING')}
                            >
                              开始处理
                            </Button>
                          )}
                          {feedback.status === 'PROCESSING' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(feedback.id, 'COMPLETED')}
                            >
                              标记完成
                            </Button>
                          )}
                          {(feedback.status === 'PENDING' || feedback.status === 'PROCESSING') && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(feedback.id, 'CLOSED')}
                            >
                              关闭
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm">
                共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(total / pageSize)))}
                  disabled={page >= Math.ceil(total / pageSize)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </Card>

          {selectedFeedback && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">反馈详情</h3>
                  <button onClick={() => setSelectedFeedback(null)} className="text-gray-500 hover:text-gray-700">
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>标题</Label>
                    <p className="mt-1">{selectedFeedback.title}</p>
                  </div>

                  <div>
                    <Label>问题类型</Label>
                    <p className="mt-1">{selectedFeedback.type?.name}</p>
                  </div>

                  <div>
                    <Label>用户信息</Label>
                    <p className="mt-1">
                      姓名：{selectedFeedback.userName || '游客'}<br />
                      邮箱：{selectedFeedback.userEmail || '未提供'}<br />
                      电话：{selectedFeedback.userPhone || '未提供'}
                    </p>
                  </div>

                  <div>
                    <Label>问题描述</Label>
                    <p className="mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
                  </div>

                  {selectedFeedback.attachments && selectedFeedback.attachments.trim() !== '' && (
                    <div>
                      <Label>附件</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const attachmentList = Array.isArray(selectedFeedback.attachments) 
                              ? selectedFeedback.attachments 
                              : JSON.parse(selectedFeedback.attachments);
                            return attachmentList.map((path: string, index: number) => {
                              const handleDownload = async (e: React.MouseEvent) => {
                                e.preventDefault();
                                try {
                                  const response = await fetch(`/api/tos/download?filePath=${encodeURIComponent(path)}`);
                                  const data = await response.json();
                                  if (data.success && data.data?.downloadUrl) {
                                    // 在新窗口打开预签名 URL 进行下载
                                    window.open(data.data.downloadUrl, '_blank');
                                  } else {
                                    alert('获取下载链接失败：' + (data.error || '未知错误'));
                                  }
                                } catch (error) {
                                  console.error('下载失败:', error);
                                  alert('下载失败，请重试');
                                }
                              };

                              return (
                                <button
                                  key={index}
                                  onClick={handleDownload}
                                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-sm text-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  附件 {index + 1}
                                </button>
                              );
                            });
                          } catch (e) {
                            return <p className="text-sm text-gray-500">附件信息无法解析</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>回复记录</Label>
                    <div className="mt-2 space-y-4">
                      {selectedFeedback.replies?.map((reply: any) => (
                        <div key={reply.id} className={`p-3 rounded ${
                          reply.isAdmin ? 'bg-blue-50' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{reply.userName} {reply.isAdmin ? '(管理员)' : ''}</span>
                            <span className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{reply.content}</p>
                        </div>
                      )) || (
                        <p className="text-gray-500">暂无回复</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>回复</Label>
                    <textarea
                      id="replyContent"
                      className="w-full p-2 border rounded mt-1"
                      rows={3}
                      placeholder="请输入回复内容"
                    ></textarea>
                    <Button
                      className="mt-2"
                      onClick={() => {
                        const content = (document.getElementById('replyContent') as HTMLTextAreaElement).value;
                        if (content) {
                          handleReply(selectedFeedback.id, content);
                          (document.getElementById('replyContent') as HTMLTextAreaElement).value = '';
                        }
                      }}
                    >
                      提交回复
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === 'types' && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">类型管理</h3>
          
          {/* 添加/编辑类型表单 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="typeName">类型名称</Label>
              <Input
                id="typeName"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="请输入类型名称"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="typeDescription">描述</Label>
              <Textarea
                id="typeDescription"
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="请输入类型描述"
                className="mt-1"
                rows={1}
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                value={newTypeSortOrder}
                onChange={(e) => setNewTypeSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              {editingType ? (
                <>
                  <Button onClick={handleUpdateType} className="mr-2">
                    保存
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline">
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

          {/* 类型列表 */}
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
      )}
    </div>
  );
}
