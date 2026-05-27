'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Eye, Send } from 'lucide-react';
import FeedbackButton from '@/components/feedback/FeedbackButton';

interface Feedback {
  id: string;
  title: string;
  description: string;
  status: string;
  type: {
    name: string;
  } | null;
  attachments?: string | null;
  createdAt: string;
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string | null;
      role: string;
    } | null;
  }>;
}

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: '处理中', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '已解决', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
};

export default function UserFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  // 加载用户的反馈列表
  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/feedback');
      const data = await response.json();
      if (response.ok) {
        setFeedbacks(data.feedbacks);
      }
    } catch (error) {
      console.error('加载反馈列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的反馈</h1>
          <p className="text-gray-600 mt-1">查看和管理您提交的问题反馈</p>
        </div>
        <FeedbackButton>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            提交反馈
          </Button>
        </FeedbackButton>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总反馈数</p>
              <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
            </div>
            <ClipboardList className="w-8 h-8 text-emerald-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">待处理</p>
              <p className="text-2xl font-bold text-yellow-600">
                {feedbacks.filter(f => f.status === 'PENDING').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold">!</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">处理中</p>
              <p className="text-2xl font-bold text-blue-600">
                {feedbacks.filter(f => f.status === 'PROCESSING').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">⚙</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已解决</p>
              <p className="text-2xl font-bold text-green-600">
                {feedbacks.filter(f => f.status === 'COMPLETED').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 反馈列表 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">反馈记录</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">您还没有提交过反馈</p>
            <FeedbackButton>
              <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50">
                <Send className="w-4 h-4 mr-2" />
                提交第一个反馈
              </Button>
            </FeedbackButton>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{feedback.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {feedback.type?.name}
                      </Badge>
                      <Badge className={statusMap[feedback.status]?.color}>
                        {statusMap[feedback.status]?.label}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {feedback.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>提交时间：{new Date(feedback.createdAt).toLocaleDateString('zh-CN')}</span>
                      {feedback.replies.length > 0 && (
                        <span className="text-emerald-600">
                          已有 {feedback.replies.length} 条回复
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedFeedback(feedback)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 详情弹窗 */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">反馈详情</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">标题</label>
                <p className="mt-1 text-gray-900">{selectedFeedback.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">问题类型</label>
                  <p className="mt-1">{selectedFeedback.type?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">状态</label>
                  <p className="mt-1">
                    <Badge className={statusMap[selectedFeedback.status]?.color}>
                      {statusMap[selectedFeedback.status]?.label}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">问题描述</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {selectedFeedback.description}
                </p>
              </div>

              {selectedFeedback.attachments && selectedFeedback.attachments.trim() !== '' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">附件</label>
                  <div className="flex flex-wrap gap-2">
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
                              className="inline-flex items-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md text-sm text-emerald-700 transition-colors"
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
                <label className="text-sm font-medium text-gray-700">提交时间</label>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedFeedback.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>

              {/* 回复列表 */}
              {selectedFeedback.replies.length > 0 && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700 block mb-3">
                    管理员回复
                  </label>
                  <div className="space-y-3">
                    {selectedFeedback.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              管
                            </div>
                            <span className="text-sm font-medium text-emerald-900">
                              {reply.user?.name || '管理员'}
                            </span>
                          </div>
                          <span className="text-xs text-emerald-600">
                            {new Date(reply.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-sm text-emerald-800">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedFeedback(null)}>
                关闭
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
