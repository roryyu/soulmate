'use client'

import { useState,memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Eye, Edit3, Loader2 } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  minHeight?: string
  height?: string
  disabled?: boolean
  isGenerating?: boolean
  setSearchEvent?: (event: { type: 'search', query: string }) => void
}

function MarkdownEditorInit({
  value,
  onChange,
  placeholder = '在此输入内容...',
  minHeight = '200px',
  height,
  disabled = false,
  isGenerating = false,
  setSearchEvent
}: MarkdownEditorProps) {
  console.log('MarkdownEditor',MarkdownEditor)
  const [isPreview, setIsPreview] = useState(true)
  //const [selectedText, setSelectedText] = useState('');

  const handleMouseUp = () => {
    // 使用 window.getSelection() 获取用户选中的文本
    const selection = window.getSelection();
    const text = selection ? selection.toString() : '';
    
    if (text.length > 0) {
      //setSelectedText(text);
      console.log('选中的文本:', text);
      // 在这里你可以触发自己的业务逻辑，比如调用 AI 接口分析文本
      if (setSearchEvent) {
        setSearchEvent({ type: 'search', query: text });
      }
    }
    
  };
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isPreview
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eye size={14} />
            预览
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !isPreview
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 size={14} />
            编辑
          </button>
        </div>
        <div className="flex items-center gap-3">
          {value && (
            <span className="text-xs text-slate-400">{value.length} 字</span>
          )}
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-teal-600">
              <Loader2 size={12} className="animate-spin" />
              正在生成...
            </span>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {isPreview ? (
        <div
          className="p-4 overflow-auto text-slate-800 text-base leading-relaxed"
          style={{ minHeight,height:height?height:'auto' }}
          onMouseUp={value ? handleMouseUp : undefined}
        >
          {value ? (
            <ReactMarkdown           
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-slate-800">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-slate-800">{children}</h2>,
                h3: ({ children }) => <h3 className="text-md font-semibold mb-2 mt-4 text-slate-800">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3 text-slate-800">{children}</h4>,
                p: ({ children }) => <p className="text-slate-700 leading-7 mb-3">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1 text-slate-700">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-slate-700">{children}</ol>,
                li: ({ children }) => <li className="text-slate-700">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-teal-500 pl-4 my-3 py-1 bg-teal-50/50 text-slate-600 italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-teal-600 font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">
                      {children}
                    </code>
                  )
                },
                hr: () => <hr className="border-slate-200 my-4" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                th: ({ children }) => (
                  <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold text-slate-800 text-sm">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-slate-100 px-4 py-2 text-slate-700 text-sm">{children}</td>
                ),
                a: ({ children, href }) => (
                  <a href={href} className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div className="text-slate-400 text-center py-8">
              <p className="text-sm">暂无内容</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-4 resize-none outline-none text-slate-800 text-base leading-relaxed font-mono bg-white disabled:bg-slate-50 disabled:text-slate-400"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}

// 记忆化组件
export const MarkdownEditor = memo(MarkdownEditorInit)



// 简单的 Markdown 渲染组件（只读）
export interface MarkdownRendererProps {
  content: string
  className?: string
  /** 是否启用原始 HTML 支持（默认 false） */
  enableRaw?: boolean
}

export function MarkdownRenderer({ content, className = '', enableRaw = false }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={enableRaw ? [rehypeRaw] : []}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-slate-800">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-slate-800">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-semibold mb-2 mt-4 text-slate-800">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3 text-slate-800">{children}</h4>,
          p: ({ children }) => <p className="text-slate-700 leading-7 mb-3">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1 text-slate-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-slate-700">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-teal-500 pl-4 my-3 py-1 bg-teal-50/50 text-slate-600 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-teal-600 font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">
                {children}
              </code>
            )
          },
          hr: () => <hr className="border-slate-200 my-4" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-4 py-2 text-left font-semibold text-slate-800 text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 px-4 py-2 text-slate-700 text-sm">{children}</td>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
