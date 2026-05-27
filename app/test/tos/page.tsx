'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, Download, Trash2, FolderOpen, Link, CheckCircle, AlertCircle } from 'lucide-react'

interface TosTestResult {
  success: boolean
  message: string
  data?: any
}

export default function TosTestPage() {
  const [bucketName, setBucketName] = useState('test-bucket')
  const [objectKey, setObjectKey] = useState('test-file.txt')
  const [fileContent, setFileContent] = useState('Hello, TOS!')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [result, setResult] = useState<TosTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeOperation, setActiveOperation] = useState('')
  const [presignedUrl, setPresignedUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showResult = (success: boolean, message: string, data?: any) => {
    setResult({ success, message, data })
    setTimeout(() => setResult(null), 5000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setUploadedFile(selectedFile)
      setObjectKey(selectedFile.name)
    }
  }

  const uploadFile = async () => {
    if (!uploadedFile && !fileContent) {
      showResult(false, '请选择文件或输入内容')
      return
    }

    setLoading(true)
    setActiveOperation('upload')

    try {
      const formData = new FormData()
      if (uploadedFile) {
        formData.append('file', uploadedFile)
      } else {
        formData.append('content', fileContent)
      }
      formData.append('bucket', bucketName)
      formData.append('key', objectKey)

      const response = await fetch('/api/tos/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '上传失败')
      }

      showResult(true, '文件上传成功！', data)
    } catch (err) {
      showResult(false, err instanceof Error ? err.message : '上传失败')
    } finally {
      setLoading(false)
      setActiveOperation('')
    }
  }

  const downloadFile = async () => {
    setLoading(true)
    setActiveOperation('download')

    try {
      const response = await fetch(`/api/tos/download?bucket=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(objectKey)}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '下载失败')
      }

      const data = await response.json()
      showResult(true, '文件下载成功！', data)
    } catch (err) {
      showResult(false, err instanceof Error ? err.message : '下载失败')
    } finally {
      setLoading(false)
      setActiveOperation('')
    }
  }

  const deleteFile = async () => {
    setLoading(true)
    setActiveOperation('delete')

    try {
      const response = await fetch(`/api/tos/delete?bucket=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(objectKey)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '删除失败')
      }

      showResult(true, '文件删除成功！', data)
    } catch (err) {
      showResult(false, err instanceof Error ? err.message : '删除失败')
    } finally {
      setLoading(false)
      setActiveOperation('')
    }
  }

  const listObjects = async () => {
    setLoading(true)
    setActiveOperation('list')

    try {
      const response = await fetch(`/api/tos/list?bucket=${encodeURIComponent(bucketName)}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '列举失败')
      }

      const data = await response.json()
      showResult(true, `找到 ${data.objects?.length || 0} 个文件`, data)
    } catch (err) {
      showResult(false, err instanceof Error ? err.message : '列举失败')
    } finally {
      setLoading(false)
      setActiveOperation('')
    }
  }

  const getPresignedUrl = async () => {
    setLoading(true)
    setActiveOperation('presigned')

    try {
      const response = await fetch(`/api/tos/presigned?bucket=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(objectKey)}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '获取URL失败')
      }

      const data = await response.json()
      setPresignedUrl(data.url)
      showResult(true, '预签名URL生成成功！', data)
    } catch (err) {
      showResult(false, err instanceof Error ? err.message : '获取URL失败')
    } finally {
      setLoading(false)
      setActiveOperation('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">TOS 对象存储测试</h1>
          <p className="text-gray-600 mt-2">测试火山引擎 TOS 对象存储的各项功能</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                存储桶配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bucket">存储桶名称</Label>
                <Input
                  id="bucket"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="输入存储桶名称"
                />
              </div>
              <div>
                <Label htmlFor="objectKey">对象键（文件路径）</Label>
                <Input
                  id="objectKey"
                  value={objectKey}
                  onChange={(e) => setObjectKey(e.target.value)}
                  placeholder="输入对象键，如: test/file.txt"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file">选择文件</Label>
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {uploadedFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    已选择: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="content">或直接输入内容</Label>
                <Textarea
                  id="content"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="输入要上传的文本内容"
                  rows={3}
                />
              </div>
              <Button
                onClick={uploadFile}
                disabled={loading}
                className="w-full"
              >
                {loading && activeOperation === 'upload' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    上传文件
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                下载文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                下载存储桶中的文件
              </p>
              <Button
                onClick={downloadFile}
                disabled={loading}
                className="w-full"
              >
                {loading && activeOperation === 'download' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    下载中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    下载文件
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                删除文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                删除存储桶中的文件（谨慎操作）
              </p>
              <Button
                onClick={deleteFile}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading && activeOperation === 'delete' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除文件
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                列举文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                列举存储桶中的所有文件
              </p>
              <Button
                onClick={listObjects}
                disabled={loading}
                className="w-full"
              >
                {loading && activeOperation === 'list' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    列举中...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    列举文件
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                获取访问链接
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                生成临时访问链接（1小时有效期）
              </p>
              <Button
                onClick={getPresignedUrl}
                disabled={loading}
                className="w-full"
              >
                {loading && activeOperation === 'presigned' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    生成链接
                  </>
                )}
              </Button>
              {presignedUrl && (
                <div className="mt-4">
                  <Label>预签名 URL</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm break-all">
                    {presignedUrl}
                  </div>
                  <Button
                    onClick={() => window.open(presignedUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    在新窗口打开
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={result.success ? 'text-green-600' : 'text-red-600'}>
                    {result.message}
                  </p>
                  {result.data && (
                    <pre className="mt-3 p-3 bg-white rounded border text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
