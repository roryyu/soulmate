'use client'

import { useState, useRef } from 'react'

export default function MusicCreateTestPage() {
  const [mid, setMid] = useState('0003-0009-0025-0030-t1')
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [cached, setCached] = useState(false)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  // OSS URL 不需要手动 revoke

  const handleSubmit = async () => {
    setError('')
    setAudioUrl('')
    setCached(false)
    setLoading(true)

    try {
      const response = await fetch('/api/music-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mid }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `请求失败: ${response.status}`)
      }

      const data = await response.json()
      setAudioUrl(data.url)
      setCached(data.cached || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">音乐编辑接口测试</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            MID
          </label>
          <input
            type="text"
            value={mid}
            onChange={(e) => setMid(e.target.value)}
            placeholder="例如: 0003-0009-0025-0030-t1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !mid.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '生成中...' : '生成音乐'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {audioUrl && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">
              生成结果
              {cached && <span className="ml-2 text-sm text-green-600 font-normal">(缓存)</span>}
            </h2>
            <audio ref={audioRef} controls src={audioUrl} className="w-full" />
          </div>
        )}
      </div>
    </div>
  )
}
