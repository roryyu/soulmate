'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectContext } from '../layout'
import {
  FileText,
  Sparkles,
  Loader2,
  Upload,
  Trash2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  File,
  FilePlus,
  Send,
  BookOpen,
  Brain,
  CheckCircle,
  AlertCircle,
  Eye,
  FileIcon,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Folder,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loading } from '@/components/ui/loading'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal'
import { INSUFFICIENT_CREDITS_CODE } from '@/lib/credits-constants'
import PDFViewer from '@/components/pdfjs/pdf-viewer'

// 类型定义
interface DirectoryNodeType {
  id: string
  name: string | null
  parentId: string | null
  description: string | null
  tenantId: string | null
  createdAt: Date
  updatedAt: Date
  docCount: number
  hasWritePermission: boolean
  children?: DirectoryNodeType[]
}

interface ResearchDocument {
  id: string
  projectId: string
  fileName: string
  fileType: string
  content?: string | null
  status: string
  embeddingStatus?: string
  embeddingProgress?: number
  embeddingError?: string | null
  createdAt: string
  analyses?: DocumentAnalysis[]
  presignedUrl?: string | null
}

interface DocumentAnalysis {
  id: string
  content: string // AI 返回的完整 Markdown 内容
}

interface DocumentChat {
  id: string
  question: string
  answer: string
  createdAt: string
}



// API 函数
async function getDocumentsApi(projectId: string): Promise<ResearchDocument[]> {
  const res = await fetch(`/api/research/projects/${projectId}/documents`)
  if (!res.ok) throw new Error('获取文档列表失败')
  return res.json()
}

async function uploadDocumentApi(
  projectId: string,
  file: File,
  directoryId?: string
): Promise<ResearchDocument> {
  const formData = new FormData()
  formData.append('file', file)
  if (directoryId) {
    formData.append('directoryId', directoryId)
  }

  const res = await fetch(`/api/research/projects/${projectId}/documents`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    // 中文注释：积分不足（402）需要触发前端引导购买/充值
    if (res.status === 402 && (errBody as any)?.code === INSUFFICIENT_CREDITS_CODE) {
      const err: any = new Error((errBody as any)?.error || '积分不足，无法完成 PDF OCR 上传')
      err.code = INSUFFICIENT_CREDITS_CODE
      throw err
    }
    const msg =
      typeof (errBody as { error?: string }).error === 'string'
        ? (errBody as { error: string }).error
        : res.status === 402
          ? '积分不足，无法完成 PDF OCR 上传'
          : '上传文档失败'
    throw new Error(msg)
  }
  return res.json()
}

async function deleteDocumentApi(projectId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/research/projects/${projectId}/documents/${docId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除文档失败')
}

async function getDocumentApi(projectId: string, docId: string): Promise<ResearchDocument> {
  const res = await fetch(`/api/research/projects/${projectId}/documents/${docId}`)
  if (!res.ok) throw new Error('获取文档详情失败')
  return res.json()
}

// SSE 流式分析文档
async function analyzeDocumentApi(
  projectId: string,
  docId: string,
  focusTopic: string | undefined,
  onChunk: (chunk: string) => void,
  onDone: (result: DocumentAnalysis) => void,
  onError: (error: string) => void
) {
  const res = await fetch(`/api/research/projects/${projectId}/documents/${docId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ focusTopic }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '分析文档失败' }))
    // 中文注释：积分不足（402）需要触发前端引导购买/充值
    if (res.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
      const err: any = new Error((errorData as any)?.error || '积分不足，无法分析文档')
      err.code = INSUFFICIENT_CREDITS_CODE
      throw err
    }
    throw new Error((errorData as any)?.error || '分析文档失败')
  }

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('无法读取响应流')
  }

  let fullResponse = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'chunk') {
              fullResponse += parsed.data
              onChunk(fullResponse)
            } else if (parsed.type === 'done') {
              // 解析完成的结果
              onDone({
                id: parsed.analysis?.id || '',
                content: parsed.analysis?.content || '',
              })
            } else if (parsed.type === 'error') {
              onError(parsed.error)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// SSE 流式问答
async function askQuestionApi(
  projectId: string,
  docId: string,
  question: string,
  onChunk: (chunk: string) => void,
  onDone: (result: { chatId: string; answer: string }) => void,
  onError: (error: string) => void
) {
  const res = await fetch(`/api/research/projects/${projectId}/documents/${docId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: '问答失败' }))
    // 中文注释：积分不足（402）需要触发前端引导购买/充值
    if (res.status === 402 && (errorData as any)?.code === INSUFFICIENT_CREDITS_CODE) {
      const err: any = new Error((errorData as any)?.error || '积分不足，无法进行问答')
      err.code = INSUFFICIENT_CREDITS_CODE
      throw err
    }
    throw new Error((errorData as any)?.error || '问答失败')
  }

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('无法读取响应流')
  }

  let fullResponse = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'chunk') {
              fullResponse += parsed.data
              onChunk(fullResponse)
            } else if (parsed.type === 'done') {
              onDone({ chatId: parsed.chatId, answer: parsed.answer || fullResponse })
            } else if (parsed.type === 'error') {
              onError(parsed.error)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

async function getChatsApi(projectId: string, docId: string): Promise<DocumentChat[]> {
  const res = await fetch(`/api/research/projects/${projectId}/documents/${docId}/chat`)
  if (!res.ok) throw new Error('获取问答历史失败')
  return res.json()
}



// 折叠卡片组件
function ResultCard({
  title,
  icon: Icon,
  content,
  defaultExpanded = true,
}: {
  title: string
  icon: React.ElementType
  content: string | null
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!content) return null

  return (
    <div className="bg-white border border-slate-200/40 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[teal-400]/20 flex items-center justify-center">
            <Icon size={18} className="text-teal-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="pl-11 prose prose-sm max-w-none">
            <MarkdownEditor
              value={content || ''}
              disabled
              minHeight="200px"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// 文献预览组件
function DocumentPreview({
  document,
  projectId,
  isDetailLoading,
  isReadMode,
  searchEvent
}: {
  document: ResearchDocument
  projectId: string
  /** 中文注释：父级正在拉取文献详情（含 presignedUrl）时为 true，避免重复请求 */
  isDetailLoading: boolean
  isReadMode:boolean
  searchEvent?: { type: string; query: string } | null
}) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 中文注释：详情接口会带 presignedUrl，同步到本地；重试时仍以本地 state 为准
  useEffect(() => {
    if(document.presignedUrl && document.id){
      setPresignedUrl(document.presignedUrl)
      setError(null)
    } 
  }, [document.presignedUrl, document.id])

  const showLoading = (isDetailLoading && !presignedUrl) || isRetrying

  // 获取预览 URL - 使用内部 API 代理
  const getPreviewUrl = () => {
    if (!presignedUrl) return null
    // 使用内部 API 代理来预览文档，确保正确的 Content-Type
    return `/api/research/projects/${projectId}/documents/${document.id}/preview`
  }

  // 下载文档
  const handleDownload = () => {
    if (presignedUrl) {
      window.open(presignedUrl, '_blank')
    }
  }

  // 全屏预览
  const handleFullscreen = () => {
    if (presignedUrl) {
      setShowFullscreen(true)
    }
  }

  return (
    <>
      <div className="bg-white border border-slate-200/40 rounded-xl overflow-hidden shadow-sm">    
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/40 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              document.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {document.fileType === 'pdf' ? (
                <FileText size={16} className="text-red-600" />
              ) : (
                <FileIcon size={16} className="text-blue-600" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-slate-800 text-sm">{document.fileName}</h4>
              <p className="text-xs text-slate-400">
                {document.fileType === 'pdf' ? 'PDF 文档' : 'Word 文档'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {presignedUrl && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  className="h-8 text-slate-600 hover:text-slate-800"
                >
                  <ZoomIn size={16} className="mr-1" />
                  全屏
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 text-slate-600 hover:text-slate-800"
                >
                  <Download size={16} className="mr-1" />
                  下载
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 预览区域 */}
        <div className="h-[600px] flex items-center justify-center bg-slate-100/50">
          {showLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 size={48} className="animate-spin text-teal-600" />
                <div className="absolute inset-0 animate-ping opacity-20">
                  <Loader2 size={48} className="text-teal-600" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">正在加载预览</p>
                <p className="text-xs text-slate-400 mt-1">请稍候...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <AlertCircle size={48} className="opacity-50" />
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRetrying(true)
                  setError(null)
                  getDocumentApi(projectId, document.id)
                    .then((doc) => setPresignedUrl(doc.presignedUrl || null))
                    .catch(() => setError('获取文档预览链接失败'))
                    .finally(() => setIsRetrying(false))
                }}
              >
                重试
              </Button>
            </div>
          ) : presignedUrl ? (              
              isReadMode?<PDFViewer file={getPreviewUrl()||''} searchEvent={searchEvent}/>:<iframe
                src={getPreviewUrl() || undefined}
                className="w-full h-full border-0"
                title={document.fileName}
              />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <FileText size={48} className="opacity-50" />
              <p className="text-sm">无法预览此文档</p>
              <p className="text-xs">请下载后查看</p>
            </div>
          )}
        </div>
      </div>

      {/* 全屏预览弹窗 */}
      {showFullscreen && presignedUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          {/* 顶部工具栏 */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900">
            <div className="flex items-center gap-3 text-white">
              <FileText size={20} />
              <span className="font-medium">{document.fileName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullscreen(false)}
              className="text-white hover:bg-slate-800"
            >
              <X size={20} className="mr-1" />
              关闭
            </Button>
          </div>
          {/* 全屏预览内容 */}
          <div className="flex-1">
            <iframe
              src={getPreviewUrl() || undefined}
              className="w-full h-full border-0"
              title={document.fileName}
            />
          </div>
        </div>
      )}
    </>
  )
}

// 加载状态已替换为统一的Loading组件

// 向量化进度条组件 - 使用统一的Loading组件
function EmbeddingProgress({
  status,
  progress,
}: {
  status?: string
  progress?: number
}) {
  if (!status || status === 'completed') return null

  const isProcessing = status === 'processing' || status === 'processing_chunks'
  const isFailed = status === 'failed'
  const isPending = status === 'pending'

  if (isProcessing) {
    return (
      <Loading
        type="progress"
        text="正在构建知识库..."
        isLoading={true}
        progress={progress}
        className="mt-2"
      />
    )
  }

  if (isFailed) {
    return (
      <div className="mt-2 p-2 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500" />
          <span className="text-xs text-red-500">向量化失败</span>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <Loading
        type="inline"
        text="等待中..."
        isLoading={true}
        className="mt-2"
      />
    )
  }

  return null
}

// 上传进度提示组件 - 使用统一的Loading组件
function UploadProgress({
  isUploading,
  progress,
}: {
  isUploading: boolean
  progress: string
}) {
  if (!isUploading) return null

  const isCompleted = progress.includes('完成')
  const isError = progress.includes('失败')

  return (
    <Loading
      type="fullscreen"
      text={isCompleted ? '上传成功' : isError ? '上传失败' : '正在上传文档'}
      isLoading={!isCompleted && !isError}
      isSuccess={isCompleted}
      isError={isError}
      successText="上传成功"
      errorText="上传失败"
    />
  )
}

// 目录树组件
function DirectoryTree({
  directories,
  selectedDirectory,
  expandedNodes,
  onToggleExpand,
  onSelectDirectory,
  allowReadOnly = false,
}: {
  directories: DirectoryNodeType[]
  selectedDirectory: DirectoryNodeType | null
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onSelectDirectory: (dir: DirectoryNodeType) => void
  allowReadOnly?: boolean
}) {
  return (
    <div className="space-y-1">
      {directories.map((dir) => (
      <DirectoryItem
        key={dir.id}
        directory={dir}
        selectedDirectory={selectedDirectory}
        expandedNodes={expandedNodes}
        onToggleExpand={onToggleExpand}
        onSelectDirectory={onSelectDirectory}
        level={0}
        allowReadOnly={allowReadOnly}
      />
    ))}
    </div>
  )
}

// 目录节点组件
function DirectoryItem({
  directory,
  selectedDirectory,
  expandedNodes,
  onToggleExpand,
  onSelectDirectory,
  level,
  allowReadOnly = false,
}: {
  directory: DirectoryNodeType
  selectedDirectory: DirectoryNodeType | null
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onSelectDirectory: (dir: DirectoryNodeType) => void
  level: number
  allowReadOnly?: boolean
}) {
  const hasChildren = directory.children && directory.children.length > 0
  const isExpanded = expandedNodes.has(directory.id)
  const isSelected = selectedDirectory?.id === directory.id
  const canSelect = allowReadOnly ? true : directory.hasWritePermission

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-teal-100 text-teal-800'
            : canSelect
              ? 'hover:bg-slate-100 text-slate-700'
              : 'text-slate-400 cursor-not-allowed'
        }`}
        style={{ paddingLeft: `${level * 16 + 8 }px` }}
        onClick={() => canSelect && onSelectDirectory(directory)}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) {
              onToggleExpand(directory.id)
            }
          }}
          className={`w-5 h-5 flex items-center justify-center ${
            hasChildren ? 'cursor-pointer' : 'invisible'
          }`}
        >
          {hasChildren && (
            <ChevronRight
              size={14}
              className={`transition-transform ${
                isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>

        {/* 目录图标 */}
        <Folder
          size={18}
          className={`ml-1 mr-2 ${
            isSelected ? 'text-teal-600' : 'text-slate-500'}`}
        />

        {/* 目录名称 */}
        <span className="flex-1 text-sm">
          {directory.name}
        </span>

        {/* 选中状态 */}
        {isSelected && (
          <CheckCircle size={16} className="ml-2 text-teal-600" />
        )}
      </div>

      {/* 子目录 */}
              {hasChildren && isExpanded && (
                <div className="mt-1">
                  {directory.children!.map((child) => (
                    <DirectoryItem
                      key={child.id}
                      directory={child}
                      selectedDirectory={selectedDirectory}
                      expandedNodes={expandedNodes}
                      onToggleExpand={onToggleExpand}
                      onSelectDirectory={onSelectDirectory}
                      level={level + 1}
                      allowReadOnly={allowReadOnly}
                    />
                  ))}
                </div>
              )}
    </div>
  )
}



// 文档卡片
function DocumentCard({
  document,
  isSelected,
  onSelect,
  onDelete,
}: {
  document: ResearchDocument
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-teal-600 bg-teal-600/5 shadow-md'
          : 'border-slate-200/40 bg-white hover:border-teal-400/60'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 图标容器 - 统一大小和样式 */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              document.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
            }`}
          >
            <FileText
              size={18}
              className={`flex-shrink-0 ${document.fileType === 'pdf' ? 'text-red-600' : 'text-blue-600'}`}
            />
          </div>
          <div>
            <h4 className="font-medium text-slate-800 text-sm line-clamp-1">
              {document.fileName}
            </h4>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {/* 向量化进度条 */}
      <EmbeddingProgress
        status={document.embeddingStatus}
        progress={document.embeddingProgress}
      />
    </div>
  )
}

// 主页面组件
export default function ReadingPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { projectInfo, projectTitleUpdated } = useProjectContext()
  const router = useRouter()

  // 状态
  const [documents, setDocuments] = useState<ResearchDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<ResearchDocument | null>(null)
  const [activeTab, setActiveTab] = useState<'read' | 'analyze' | 'chat'>('read')
  const [projectTitle, setProjectTitle] = useState('')

  // 加载状态
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [isLoadingChats, setIsLoadingChats] = useState(false)

  // 上传状态
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 分析状态
  const [focusTopic, setFocusTopic] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(null)
  const [streamingAnalysisContent, setStreamingAnalysisContent] = useState('')
  const [editAnalysisContent, setEditAnalysisContent] = useState('')
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false)

  // 问答状态
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [chats, setChats] = useState<DocumentChat[]>([])
  const [streamingAnswer, setStreamingAnswer] = useState('')

  // 删除确认：待删除文档信息（为 null 时不显示弹层）
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    fileName: string
  } | null>(null)
  const [isDeletingDoc, setIsDeletingDoc] = useState(false)
  const [creditsModal, setCreditsModal] = useState<{ open: boolean; description?: string }>({
    open: false,
  })

  // 上传相关状态
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [directories, setDirectories] = useState<DirectoryNodeType[]>([])
  const [selectedDirectory, setSelectedDirectory] = useState<DirectoryNodeType | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isLoadingDirectories, setIsLoadingDirectories] = useState(false)

  // 导入相关状态
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importDirectories, setImportDirectories] = useState<DirectoryNodeType[]>([])
  const [importSelectedDirectory, setImportSelectedDirectory] = useState<DirectoryNodeType | null>(null)
  const [importExpandedNodes, setImportExpandedNodes] = useState<Set<string>>(new Set())
  const [importDocuments, setImportDocuments] = useState<any[]>([])
  const [selectedImportDocs, setSelectedImportDocs] = useState<any[]>([])
  const [isLoadingImportDirs, setIsLoadingImportDirs] = useState(false)
  const [isLoadingImportDocs, setIsLoadingImportDocs] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  // 中文注释：列表不含正文与预签名 URL，选中文献后单独拉详情
  const [isLoadingDocDetail, setIsLoadingDocDetail] = useState(false)
  const [isReadMode, setIsReadMode] = useState(false)
  //搜索PDF关键词
  const [searchEvent, setSearchEvent] = useState<{ type: string; query: string } | null>(null)

  const handleSearchEvent = useCallback((data:any) => {
    setSearchEvent(data);
  }, []);

  // 切换项目时清空本地文献状态，避免沿用上一条项目的选中项
  useEffect(() => {
    setSelectedDoc(null)
    setDocuments([])
  }, [projectId])

  // 监听课题标题变化，同步更新聚焦主题
  useEffect(() => {
    if (projectInfo?.title) {
      setProjectTitle(projectInfo.title)
      // 默认使用项目题目作为聚焦主题
      setFocusTopic(projectInfo.title)
    }
  }, [projectInfo?.title, projectTitleUpdated])

  // 中文注释：按当前选中 id 拉取完整文献（content、analyses、presignedUrl），切换文献时取消上一次请求
  useEffect(() => {
    const id = selectedDoc?.id
    if (!id) {
      setIsLoadingDocDetail(false)
      return
    }

    let cancelled = false
    setIsLoadingDocDetail(true)
    ;(async () => {
      try {
        const full = await getDocumentApi(projectId, id)
        if (cancelled) return
        setSelectedDoc((prev) => (prev?.id === id ? full : prev))
      } catch (err) {
        if (!cancelled) console.error('加载文献详情失败:', err)
      } finally {
        if (!cancelled) {
          setIsLoadingDocDetail(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedDoc?.id, projectId])

  // 加载文档列表：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const docs = await getDocumentsApi(projectId)
      setDocuments(docs)
      setSelectedDoc((prev) => {
        if (docs.length > 0 && !prev) return docs[0]
        return prev
      })
    } catch (err) {
      console.error('加载文档失败:', err)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [projectId])
 
  // 加载文档列表
  useEffect(() => {
      loadDocuments()
  }, [loadDocuments])

  // 是否存在需要轮询的向量化任务：用 useMemo 避免依赖只写 length 导致告警
  const hasPendingDoc = useMemo(() => {
    if (documents.length === 0) return false
    return documents.some(
      (doc) => doc.embeddingStatus && doc.embeddingStatus !== 'completed' && doc.embeddingStatus !== 'failed'
    )
  }, [documents])

  // 轮询向量化进度
  useEffect(() => {
    if (!hasPendingDoc) return

    const interval = setInterval(async () => {
      try {
        const docs = await getDocumentsApi(projectId)
        setDocuments(docs)
        // 中文注释：列表行无正文，不能把整份 selectedDoc 换成列表项，只合并向量化相关字段
        setSelectedDoc((prev) => {
          if (!prev) return prev
          const row = docs.find((d) => d.id === prev.id)
          if (!row) return prev
          return {
            ...prev,
            embeddingStatus: row.embeddingStatus,
            embeddingProgress: row.embeddingProgress,
            embeddingError: row.embeddingError,
            status: row.status,
            fileName: row.fileName,
            fileType: row.fileType,
          }
        })
      } catch (err) {
        console.error('更新进度失败:', err)
      }
    }, 3000) // 每 3 秒轮询一次

    return () => clearInterval(interval)
  }, [hasPendingDoc, projectId])



  // 加载问答历史：用 useCallback 固定引用，避免 useEffect 依赖缺失告警
  const loadChats = useCallback(async (docId: string) => {
    setIsLoadingChats(true)
    try {
      const chatData = await getChatsApi(projectId, docId)
      setChats(chatData)
    } catch (err) {
      console.error('加载问答历史失败:', err)
    } finally {
      setIsLoadingChats(false)
    }
  }, [projectId])

  // 加载选中文档的问答
  useEffect(() => {
    if (selectedDoc) {
      loadChats(selectedDoc.id)
      // 加载分析结果
      if (selectedDoc.analyses && selectedDoc.analyses.length > 0) {
        const analysis = selectedDoc.analyses[0]
        setAnalysisResult(analysis)
        setEditAnalysisContent(analysis.content || '')
      } else {
        setAnalysisResult(null)
        setEditAnalysisContent('')
      }
    }
  }, [selectedDoc, loadChats])



  // 加载目录树
  const loadDirectories = async () => {
    setIsLoadingDirectories(true)
    try {
      const response = await fetch('/api/directory/find-by-user')
      if (response.ok) {
        const data = await response.json()
        setDirectories(data.directories || [])
      }
    } catch (error) {
      console.error('加载目录失败:', error)
    } finally {
      setIsLoadingDirectories(false)
    }
  }

  // 打开上传弹窗
  const openUploadModal = async () => {
    await loadDirectories()
    setUploadModalOpen(true)
    setSelectedDirectory(null)
    setSelectedFiles([])
  }

  // 切换目录展开
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // 选择目录
  const selectDirectory = (dir: DirectoryNodeType) => {
    if (!dir.hasWritePermission) return
    setSelectedDirectory(dir)
  }

  // 处理文件选择
  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setSelectedFiles(Array.from(files))
  }

  // 上传文档（带目录）
  const handleUploadWithDirectory = async () => {
    if (!selectedDirectory) {
      alert('请先选择一个目录')
      return
    }
    if (selectedFiles.length === 0) {
      alert('请选择要上传的文件')
      return
    }

    // 检查上传数量限制（最多 30 篇）
    const maxDocuments = 30
    if (documents.length + selectedFiles.length > maxDocuments) {
      alert(`最多只能上传 ${maxDocuments} 篇文献。当前已有 ${documents.length} 篇，最多还能上传 ${maxDocuments - documents.length} 篇。`)
      return
    }

    setIsUploading(true)
    setUploadProgress('准备上传...')
    setUploadModalOpen(false)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        // 更新进度提示
        setUploadProgress(`正在上传 ${i + 1}/${selectedFiles.length}: ${file.name}`)
        
        // 添加延迟让用户看到进度更新
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const doc = await uploadDocumentApi(projectId, file, selectedDirectory.id)
        
        // 更新进度提示
        setUploadProgress(`正在处理 ${i + 1}/${selectedFiles.length}: ${file.name}`)
        
        setDocuments((prev) => [doc, ...prev])
        if (!selectedDoc) {
          setSelectedDoc(doc)
        }
        
        // 添加延迟让用户看到处理完成
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      setActiveTab('analyze')
      
      // 立即关闭进度提示，不显示成功弹窗
      setIsUploading(false)
      setUploadProgress('')
      
    } catch (err) {
      console.error('上传失败:', err)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((err as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (err as any)?.message || '积分不足，无法完成 PDF OCR 上传。请购买会员或充值积分后继续使用。',
        })
      }
      setUploadProgress('上传失败，请重试')
      
      // 3 秒后关闭进度提示
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress('')
      }, 3000)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 导入相关功能
  const openImportModal = async () => {
    await loadImportDirectories()
    setImportModalOpen(true)
    setImportSelectedDirectory(null)
    setSelectedImportDocs([])
    setImportDocuments([])
  }

  const loadImportDirectories = async () => {
    setIsLoadingImportDirs(true)
    try {
      const response = await fetch('/api/directory/find-by-user-with-read')
      if (response.ok) {
        const data = await response.json()
        setImportDirectories(data.directories || [])
      }
    } catch (error) {
      console.error('加载目录失败:', error)
    } finally {
      setIsLoadingImportDirs(false)
    }
  }

  const toggleImportExpand = (nodeId: string) => {
    const newExpanded = new Set(importExpandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setImportExpandedNodes(newExpanded)
  }

  const selectImportDirectory = async (dir: DirectoryNodeType) => {
    // READ_ONLY 或 READ_WRITE 都可以选择
    setImportSelectedDirectory(dir)
    // 加载该目录下的文档
    await loadDirectoryDocuments(dir.id)
  }

  const loadDirectoryDocuments = async (directoryId: string) => {
    setIsLoadingImportDocs(true)
    try {
      const response = await fetch(`/api/directory/get-documents?directoryId=${directoryId}`)
      if (response.ok) {
        const data = await response.json()
        setImportDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('加载文档失败:', error)
    } finally {
      setIsLoadingImportDocs(false)
    }
  }

  const toggleSelectImportDoc = (doc: any) => {
    const isSelected = selectedImportDocs.some((d) => d.id === doc.id)
    if (isSelected) {
      setSelectedImportDocs(selectedImportDocs.filter((d) => d.id !== doc.id))
    } else {
      const maxDocuments = 30
      if (documents.length + selectedImportDocs.length + 1 > maxDocuments) {
        alert(`最多只能导入 ${maxDocuments} 篇文献。当前已有 ${documents.length} 篇，已选择 ${selectedImportDocs.length} 篇，最多还能选择 ${maxDocuments - documents.length - selectedImportDocs.length} 篇。`)
        return
      }
      setSelectedImportDocs([...selectedImportDocs, doc])
    }
  }

  const removeSelectedImportDoc = (docId: string) => {
    setSelectedImportDocs(selectedImportDocs.filter((d) => d.id !== docId))
  }

  const handleImportDocuments = async () => {
    if (selectedImportDocs.length === 0) {
      alert('请选择要导入的文档')
      return
    }

    setIsImporting(true)
    setImportModalOpen(false)

    try {
      const response = await fetch(`/api/research/projects/${projectId}/documents/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: selectedImportDocs.map((d) => d.id) })
      })

      if (response.ok) {
        // 重新加载文档列表
        await loadDocuments()
      } else {
        const errorData = await response.json().catch(() => ({ error: '导入失败' }))
        alert(errorData.error || '导入失败，请重试')
      }
    } catch (error) {
      console.error('导入失败:', error)
      alert('导入失败，请重试')
    } finally {
      setIsImporting(false)
    }
  }

  // 删除文档（仅在确认框点击「删除」后调用）
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const docId = deleteTarget.id
    setIsDeletingDoc(true)
    try {
      await deleteDocumentApi(projectId, docId)
      const newDocs = documents.filter((d) => d.id !== docId)
      setDocuments(newDocs)
      if (selectedDoc?.id === docId) {
        setSelectedDoc(newDocs[0] || null)
      }
      setDeleteTarget(null)
    } catch (err) {
      console.error('删除失败:', err)
    } finally {
      setIsDeletingDoc(false)
    }
  }

  // 分析文档 - 支持 SSE 流式
  const handleAnalyze = async () => {
    if (!selectedDoc || isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisResult(null)
    setStreamingAnalysisContent('')

    try {
      await analyzeDocumentApi(
        projectId,
        selectedDoc.id,
        focusTopic || undefined,
        // onChunk - 实时更新流式内容
        (chunk) => {
          setStreamingAnalysisContent(chunk)
        },
        // onDone - 处理最终结果
        (result) => {
          setAnalysisResult(result)
          setEditAnalysisContent(result.content || '')
          setStreamingAnalysisContent('')
          // 刷新文档列表以获取最新分析
          loadDocuments()
        },
        // onError - 处理错误
        (error) => {
          console.error('分析失败:', error)
          setStreamingAnalysisContent('')
        }
      )
    } catch (err) {
      console.error('分析失败:', err)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((err as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (err as any)?.message || '积分不足，无法分析文档。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 保存分析结果编辑
  const handleSaveAnalysis = async () => {
    if (!selectedDoc || !analysisResult || !editAnalysisContent.trim()) return
    setIsSavingAnalysis(true)
    try {
      const res = await fetch(
        `/api/research/projects/${projectId}/documents/${selectedDoc.id}/analysis/${analysisResult.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editAnalysisContent }),
        }
      )
      if (res.ok) {
        const updated = await res.json()
        setAnalysisResult({ ...analysisResult, content: updated.content })
        // 刷新文档列表
        loadDocuments()
      } else {
        alert('保存失败')
      }
    } catch (err) {
      console.error('保存分析结果失败:', err)
      alert('保存失败')
    } finally {
      setIsSavingAnalysis(false)
    }
  }

  // 提问 - 支持 SSE 流式
  const handleAsk = async () => {
    if (!selectedDoc || !question.trim() || isAsking) return

    setIsAsking(true)
    setStreamingAnswer('')

    try {
      await askQuestionApi(
        projectId,
        selectedDoc.id,
        question.trim(),
        // onChunk - 实时更新流式内容
        (chunk) => {
          setStreamingAnswer(chunk)
        },
        // onDone - 处理最终结果
        (result) => {
          setChats((prevChats) => [
            ...prevChats,
            {
              id: result.chatId,
              question: question.trim(),
              answer: result.answer,
              createdAt: new Date().toISOString(),
            },
          ])
          setQuestion('')
          setStreamingAnswer('')
        },
        // onError - 处理错误
        (error) => {
          console.error('提问失败:', error)
          setStreamingAnswer('')
        }
      )
    } catch (err) {
      console.error('提问失败:', err)
      // 中文注释：积分不足时弹窗引导去购买/充值
      if ((err as any)?.code === INSUFFICIENT_CREDITS_CODE) {
        setCreditsModal({
          open: true,
          description: (err as any)?.message || '积分不足，无法进行问答。请购买会员或充值积分后继续使用。',
        })
      }
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">     
      {/* 页面标题 */}
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-teal-600" size={28} />
            文献速读
          </h1>
          <p className="text-slate-500 mt-1">
          上传文献文档,快速把握要点,支持边读边问
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="readMode"
            checked={isReadMode}
            disabled={!(selectedDoc && analysisResult)}
            onChange={(e) => {
              setIsReadMode(e.target.checked)
              if (e.target.checked) {
                setActiveTab('read')
              }
            }}
            className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <label htmlFor="readMode" className="text-sm text-slate-600">
            阅读模式
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文档列表 */}
        <div className="lg:col-span-1 space-y-4" style={isReadMode?{display:'none'}:{}}>
          {/* 文档管理卡片 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">文献管理</h2>
            
            <div className="space-y-3">
              {/* 上传按钮 */}
              <Button
                onClick={openUploadModal}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isUploading || documents.length >= 30}
              >
                {isUploading ? (
                  <Loading type="button" text="上传中" isLoading={true} />
                ) : documents.length >= 30 ? (
                  <>
                    <Plus size={16} className="mr-2" />
                    已达上限（30 篇）
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    上传文献
                  </>
                )}
              </Button>

              {/* 导入文献按钮 */}
              <Button
                onClick={openImportModal}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isUploading || documents.length >= 30}
              >
                {documents.length >= 30 ? (
                  <>
                    <FileText size={16} className="mr-2" />
                    已达上限（30 篇）
                  </>
                ) : (
                  <>
                    <FileText size={16} className="mr-2" />
                    导入文献
                  </>
                )}
              </Button>

              {/* 文档格式支持提示 */}
              <p className="text-xs text-slate-400 text-center">
                支持 PDF、DOCX 格式，最多上传 30 篇
              </p>
            </div>
          </div>
          
          {/* 文献列表卡片 */}
          <div className="bg-white border border-slate-200/40 rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">文献列表</h2>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-4">
                  <Loading type="inline" text="加载文献中..." isLoading={true} />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-slate-400">暂无文献，请先上传</p>
              ) : (
                documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    isSelected={selectedDoc?.id === doc.id}
                    onSelect={() => setSelectedDoc(doc)}
                    onDelete={() =>
                      setDeleteTarget({ id: doc.id, fileName: doc.fileName })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：主内容区 */}
        <div className={isReadMode?"lg:col-span-6":"lg:col-span-2"}>
          {/* Tab 切换 */}
          <div className="flex gap-2 mb-4" style={isReadMode?{display:'none'}:{}}>
            <Button
              variant={activeTab === 'read' ? 'default' : 'outline'}
              onClick={() => setActiveTab('read')}
              disabled={!selectedDoc}
              className={
                activeTab === 'read'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-slate-200'
              }
            >
              <Eye size={16} className="mr-2" />
              文献阅读
            </Button>
            <Button
              variant={activeTab === 'analyze' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analyze')}
              disabled={!selectedDoc}
              className={
                activeTab === 'analyze'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-slate-200'
              }
            >
              <Sparkles size={16} className="mr-2" />
              要点梳理
            </Button>
            <Button
              variant={activeTab === 'chat' ? 'default' : 'outline'}
              onClick={() => setActiveTab('chat')}
              disabled={!selectedDoc}
              className={
                activeTab === 'chat'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-slate-200'
              }
            >
              <MessageCircle size={16} className="mr-2" />
              边读边问
            </Button>
          </div>

          {/* 阅读模式 */}
          {isReadMode && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {selectedDoc && (
                <>
                  {/* 分析结果 */}
                  {(isAnalyzing || analysisResult || streamingAnalysisContent) && (
                    <div className="space-y-4">
                      
                      {isAnalyzing && !analysisResult && !streamingAnalysisContent ? (
                        <Loading text="正在分析文献..." isLoading={true} />
                      ) : analysisResult ? (
                        <div className="bg-white border border-slate-200/40 rounded-xl shadow-sm px-5 py-3">
                          <div className="font-semibold text-slate-800 flex items-center" style={{height:'48px'}}>
                            <FileText size={20} className="text-teal-600" />
                            分析结果
                          </div>
                          <MarkdownEditor
                            value={isAnalyzing ? streamingAnalysisContent : editAnalysisContent}
                            onChange={setEditAnalysisContent}
                            isGenerating={isAnalyzing}
                            height="487px"
                            setSearchEvent={handleSearchEvent}
                          />
                          {!isAnalyzing && (
                            <div className="flex justify-end mt-4">
                              <Button
                                onClick={handleSaveAnalysis}
                                disabled={isSavingAnalysis || editAnalysisContent === analysisResult.content}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                              >
                                {isSavingAnalysis ? (
                                  <Loading type="inline" text="保存中..." isLoading={true} />
                                ) : (
                                  <>
                                    <CheckCircle size={16} className="mr-2" />
                                    保存修改
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
              <div className="lg:col-span-1 space-y-4">
                {!selectedDoc ? (
                  <div></div>
                ) : (
                  <DocumentPreview
                    document={selectedDoc}
                    projectId={projectId}
                    isDetailLoading={isLoadingDocDetail}
                    isReadMode={isReadMode}
                    searchEvent={searchEvent}
                  />
                )}
              </div>
            </div>
          )}          
          {/* 文献阅读面板 */}
          {!isReadMode && activeTab === 'read' && (
            <div className="space-y-4">
              {!selectedDoc ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>请先上传或选择文献</p>
                </div>
              ) : (
                <DocumentPreview
                  document={selectedDoc}
                  projectId={projectId}
                  isDetailLoading={isLoadingDocDetail}
                  isReadMode={isReadMode}
                />
              )}
            </div>
          )}

          {/* 分析面板 */}
          {!isReadMode && activeTab === 'analyze' && (
            <div className="space-y-4">
              {!selectedDoc ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>请先上传或选择文献</p>
                </div>
              ) : isLoadingDocDetail && !selectedDoc.content ? (
                <div className="bg-white border border-slate-200/40 rounded-xl p-10 flex justify-center">
                  <Loading type="inline" text="正在加载文献内容..." isLoading={true} />
                </div>
              ) : !selectedDoc.content ? (
                <div className="bg-white border border-slate-200/40 rounded-xl p-5">
                  <p className="text-slate-400">该文档解析失败，请重新上传</p>
                </div>
              ) : (
                <>
                  {/* 分析选项 */}
                  <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm">
                    <h3 className="text-lg font-medium text-slate-800 mb-3">智能分析</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      自动分析文献的主要内容、基本框架、核心观点、研究方法和精读部分
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-800 mb-1.5">
                        聚焦主题（可选，默认为课题题目）
                      </label>
                      <Input
                        value={focusTopic}
                        onChange={(e) => setFocusTopic(e.target.value)}
                        placeholder="输入您关注的课题主题..."
                        className="bg-white border-slate-200 rounded-xl"
                      />
                    </div>

                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isAnalyzing ? (
                        <Loading type="button" text="正在分析..." isLoading={true} />
                      ) : (
                        <>
                          <Sparkles size={18} className="mr-2" />
                          开始分析
                        </>
                      )}
                    </Button>
                  </div>

                  {/* 分析结果 */}
                  {(isAnalyzing || analysisResult || streamingAnalysisContent) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={20} className="text-teal-600" />
                        分析结果
                      </h3>

                      {/* 流式分析内容预览 */}
                      {streamingAnalysisContent && (
                        <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm">
                          <MarkdownEditor
                            value={streamingAnalysisContent}
                            disabled
                            isGenerating={true}
                            minHeight="200px"
                          />
                        </div>
                      )}

                      {isAnalyzing && !analysisResult && !streamingAnalysisContent ? (
                        <Loading text="正在分析文献..." isLoading={true} />
                      ) : analysisResult ? (
                        <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm">
                          <MarkdownEditor
                            value={isAnalyzing ? streamingAnalysisContent : editAnalysisContent}
                            onChange={setEditAnalysisContent}
                            isGenerating={isAnalyzing}
                            minHeight="200px"
                          />
                          {!isAnalyzing && (
                            <div className="flex justify-end mt-4">
                              <Button
                                onClick={handleSaveAnalysis}
                                disabled={isSavingAnalysis || editAnalysisContent === analysisResult.content}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                              >
                                {isSavingAnalysis ? (
                                  <Loading type="inline" text="保存中..." isLoading={true} />
                                ) : (
                                  <>
                                    <CheckCircle size={16} className="mr-2" />
                                    保存修改
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 问答面板 */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {!selectedDoc ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>请先选择文献</p>
                </div>
              ) : (
                <>
                  {/* 问答历史 */}
                  <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm max-h-[400px] overflow-y-auto">
                    <h3 className="text-lg font-medium text-slate-800 mb-4">问答记录</h3>
                    {isLoadingChats ? (
                      <div className="flex items-center justify-center py-4">
                        <Loading type="inline" text="加载问答历史中..." isLoading={true} />
                      </div>
                    ) : chats.length === 0 && !streamingAnswer ? (
                      <p className="text-slate-400 text-sm">
                        暂无问答记录，可以在下方向 AI 提问
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {chats.map((chat) => (
                          <div key={chat.id} className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                                Q
                              </div>
                              <p className="text-sm text-slate-800">{chat.question}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-[teal-400] flex items-center justify-center text-white text-xs flex-shrink-0">
                                A
                              </div>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">
                                {chat.answer}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* 流式回答预览 */}
                        {streamingAnswer && (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                                Q
                              </div>
                              <p className="text-sm text-slate-800">{question}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-[teal-400] flex items-center justify-center text-white text-xs flex-shrink-0">
                                A
                              </div>
                              <div className="text-sm text-slate-800 whitespace-pre-wrap">
                                {streamingAnswer}
                                <span className="animate-pulse inline-block w-0.5 h-4 bg-teal-600 ml-0.5"></span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 提问输入 */}
                  <div className="bg-white border border-slate-200/40 rounded-xl p-5 shadow-sm">
                    <div className="flex gap-2">
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAsk()
                          }
                        }}
                        placeholder="请输入关于这篇文献的问题..."
                        className="flex-1 border-slate-200"
                        disabled={isAsking}
                      />
                      <Button
                        onClick={handleAsk}
                        disabled={!question.trim() || isAsking}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isAsking ? (
                          <Loading type="button" text="" isLoading={true} />
                        ) : (
                          <>
                            <Send size={18} className="mr-2" />
                            提问
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">按 Enter 发送问题</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 删除文献确认弹层 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-doc-title"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !isDeletingDoc && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200/80 p-6">
            <h2
              id="delete-doc-title"
              className="text-lg font-semibold text-slate-800"
            >
              确认删除
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              确定要删除「{deleteTarget.fileName}」吗？此操作不可恢复。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200"
                disabled={isDeletingDoc}
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingDoc}
                onClick={handleConfirmDelete}
              >
                {isDeletingDoc ? (
                  <Loading type="button" text="删除中" isLoading={true} />
                ) : (
                  '删除'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 上传弹窗 */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setUploadModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">上传文献</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadModalOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-6">
              {/* 目录选择 */}
              <div>
                <Label className="text-slate-700 font-medium">选择目录</Label>
                <p className="text-sm text-slate-500 mb-3">
                  请选择一个您有读写权限的目录
                </p>
                <div className="border border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto bg-slate-50">
                  {isLoadingDirectories ? (
                    <div className="flex items-center justify-center py-8">
                      <Loading type="inline" text="加载目录中..." isLoading={true} />
                    </div>
                  ) : directories.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Folder className="w-12 h-12 mx-auto mb-2" />
                      <p>暂无可选目录</p>
                    </div>
                  ) : (
                    <DirectoryTree
                      directories={directories}
                      selectedDirectory={selectedDirectory}
                      expandedNodes={expandedNodes}
                      onToggleExpand={toggleExpand}
                      onSelectDirectory={selectDirectory}
                    />
                  )}
                </div>
                {selectedDirectory && (
                  <div className="mt-2 text-sm text-teal-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} />
                      已选择: {selectedDirectory.name}
                    </div>
                  </div>
                )}
              </div>

              {/* 文件选择 */}
              <div>
                <Label className="text-slate-700 font-medium">选择文件</Label>
                <div className="mt-2">
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-800">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFiles = [...selectedFiles]
                              newFiles.splice(index, 1)
                              setSelectedFiles(newFiles)
                            }}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        multiple
                        onChange={handleModalFileSelect}
                        className="hidden"
                        id="file-input-modal"
                      />
                      <label
                        htmlFor="file-input-modal"
                        className="cursor-pointer"
                      >
                        <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                        <p className="text-slate-600">点击选择文件</p>
                        <p className="text-xs text-slate-400">
                          支持 PDF、DOCX 格式，最多上传 30 篇
                        </p>
                      </label>
                    </div>
                  )}
                  {selectedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const input = document.getElementById('file-input-modal') as HTMLInputElement
                        input?.click()
                      }}
                    >
                      <Plus size={16} className="mr-2" />
                      添加更多文件
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
              >
                取消
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleUploadWithDirectory}
                disabled={!selectedDirectory || selectedFiles.length === 0}
              >
                <Upload size={16} className="mr-2" />
                确认上传
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setImportModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-slate-800">导入文献</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportModalOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* 左侧：目录树 */}
              <div className="w-full md:w-1/3 border-r border-slate-200 p-4 overflow-y-auto">
                <Label className="text-slate-700 font-medium mb-3 block">选择目录</Label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-80 overflow-y-auto bg-slate-50">
                  {isLoadingImportDirs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loading type="inline" text="加载目录中..." isLoading={true} />
                    </div>
                  ) : importDirectories.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Folder className="w-12 h-12 mx-auto mb-2" />
                      <p>暂无可选目录</p>
                    </div>
                  ) : (
                    <DirectoryTree
                      directories={importDirectories}
                      selectedDirectory={importSelectedDirectory}
                      expandedNodes={importExpandedNodes}
                      onToggleExpand={toggleImportExpand}
                      onSelectDirectory={selectImportDirectory}
                    />
                  )}
                </div>
              </div>

              {/* 右侧 */}
              <div className="w-full md:w-2/3 flex flex-col">
                {/* 右上：已选文档 */}
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-700 font-medium">
                      已选 ({selectedImportDocs.length}/{30 - documents.length})
                    </Label>
                  </div>
                  {selectedImportDocs.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {selectedImportDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                        >
                          <FileText size={16} className="text-slate-500" />
                          <span className="text-sm text-slate-700 max-w-32 truncate">
                            {doc.fileName}
                          </span>
                          <button
                            onClick={() => removeSelectedImportDoc(doc.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">请从下方选择文档</p>
                  )}
                </div>

                {/* 右下：目录下文档 */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <Label className="text-slate-700 font-medium mb-3 block">
                    选择文档 {importSelectedDirectory ? `- ${importSelectedDirectory.name}` : ''}
                  </Label>
                  {!importSelectedDirectory ? (
                    <div className="text-center py-16 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p>请先从左侧选择目录</p>
                    </div>
                  ) : isLoadingImportDocs ? (
                    <div className="flex items-center justify-center py-16">
                      <Loading type="inline" text="加载文档中..." isLoading={true} />
                    </div>
                  ) : importDocuments.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p>该目录下暂无文档</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {importDocuments.map((doc) => {
                        const isSelected = selectedImportDocs.some((d) => d.id === doc.id)
                        const canSelect = !isSelected && documents.length + selectedImportDocs.length < 30
                        return (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => (isSelected || canSelect) && toggleSelectImportDoc(doc)}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <FileText
                              size={20}
                              className={doc.fileType === 'pdf' ? 'text-red-500' : 'text-blue-500'}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 truncate">{doc.fileName}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle size={16} className="text-blue-600" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setImportModalOpen(false)}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleImportDocuments}
                disabled={selectedImportDocs.length === 0 || isImporting}
              >
                {isImporting ? (
                  <Loading type="button" text="导入中" isLoading={true} />
                ) : (
                  <>
                    <FileText size={16} className="mr-2" />
                    确认导入 ({selectedImportDocs.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 上传进度提示 */}
      <UploadProgress
        isUploading={isUploading}
        progress={uploadProgress}
      />

      <InsufficientCreditsModal
        open={creditsModal.open}
        description={creditsModal.description}
        onClose={() => setCreditsModal({ open: false })}
        onGoPay={() => {
          setCreditsModal({ open: false })
          router.push('/payment')
        }}
      />
    </div>
  )
}
