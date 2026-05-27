'use client';

import React, { useState, useEffect } from 'react';
import FeedbackForm from './FeedbackForm';

interface FeedbackButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

export default function FeedbackButton({ children, onClick }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [types, setTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 加载问题类型（使用公开接口，不需要管理员权限）
    const loadTypes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/feedback-types');
        if (response.ok) {
          const data = await response.json();
          setTypes(data.types || []);
        } else {
          // 如果接口不可用，使用默认类型
          setTypes([
            { id: '1', name: '功能建议' },
            { id: '2', name: 'Bug 反馈' },
            { id: '3', name: '使用问题' },
            { id: '4', name: '其他' },
          ]);
        }
      } catch (error) {
        console.error('加载问题类型失败:', error);
        // 使用默认类型
        setTypes([
          { id: '1', name: '功能建议' },
          { id: '2', name: 'Bug 反馈' },
          { id: '3', name: '使用问题' },
          { id: '4', name: '其他' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTypes();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert('反馈提交成功！我们会尽快处理您的问题。');
        setIsOpen(false);
      } else {
        const errorData = await response.json();
        alert(`提交失败：${errorData.error || '请重试'}`);
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsOpen(true);
  };

  if (isLoading) return null;

  // 如果有 children，则渲染 children 作为触发器
  if (children) {
    return (
      <>
        <div onClick={handleClick}>
          {children}
        </div>
        <FeedbackForm
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSubmit={handleSubmit}
          types={types}
        />
      </>
    );
  }

  // 否则渲染默认的浮动按钮
  return (
    <>
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white p-3 rounded-full shadow-lg shadow-sky-200 transition-all z-40"
        aria-label="提交反馈"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <FeedbackForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        types={types}
      />
    </>
  );
}