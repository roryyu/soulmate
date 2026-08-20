'use client'

import { useState, useRef } from 'react'

export default function ApiTestPage() {
  const [url, setUrl] = useState('/api/open/music')
  const [params, setParams] = useState(`{
  "uid": "test-user-001",
  "data": {
    "mood": "relaxed",
    "time": "evening"
  }
}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatJson = () => {
    try {
      const parsed = JSON.parse(params)
      setParams(JSON.stringify(parsed, null, 2))
      setError('')
    } catch {
      setError('JSON格式错误')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setAudioUrl('')
    setLoading(true)

    try {
      const parsedParams = JSON.parse(params)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedParams),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `请求失败: ${response.status}`)
      }

      const blob = await response.blob()
      const audioObjectUrl = URL.createObjectURL(blob)
      setAudioUrl(audioObjectUrl)

      setTimeout(() => {
        audioRef.current?.play()
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">接口测试</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">接口URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="/api/open/music"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">入参 (JSON)</label>
              <button
                onClick={formatJson}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                格式化
              </button>
            </div>
            <textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              rows={10}
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              placeholder='{"uid": "xxx", "data": {...}}'
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '请求中...' : '提交'}
          </button>
        </div>

        {audioUrl && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">播放结果</h2>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}