export default function HealthPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-32">
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <button className="text-gray-400 text-lg font-medium">置顶</button>
          <h1 className="text-3xl font-bold text-black">摘要</h1>
          <button className="text-blue-500 text-lg font-medium">编辑</button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🔥</span>
                <span className="text-3xl font-bold text-orange-500">步数</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-400">2038年1月</span>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className="mt-8 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-bold text-black">736</span>
                <span className="text-3xl text-gray-400">步</span>
              </div>
              <div className="w-4 h-48 bg-orange-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🛏️</span>
                <span className="text-3xl font-bold text-indigo-500">睡眠评分</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-400">今天</span>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className="mt-16">
              <div className="text-6xl font-bold text-black">无数据</div>
            </div>
          </div>

          <button className="w-full bg-white rounded-3xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 border-4 border-gray-300 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">❤️</span>
              </div>
              <span className="text-3xl font-semibold text-black">显示所有健康数据</span>
            </div>
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-12">
          <h2 className="text-5xl font-bold text-black mb-4">趋势</h2>
          <button className="w-full bg-white rounded-3xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">↗️</span>
              <span className="text-3xl font-semibold text-black">显示所有健康趋势</span>
            </div>
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-12">
          <h2 className="text-5xl font-bold text-black mb-4">提要</h2>
          <div className="bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🔥</span>
                <span className="text-3xl font-bold text-orange-500">步行+跑步距离</span>
              </div>
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-[46px] font-semibold text-black leading-tight mb-8">
              你过去7天的步行和跑步距离为平均每天 5.2 公里。
            </p>
            <div className="border-t border-gray-200 pt-8">
              <p className="text-3xl font-semibold text-gray-400 mb-4">平均距离</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-6xl font-bold text-black">5.2</span>
                <span className="text-3xl text-gray-400">公里</span>
              </div>
              <div className="flex items-end justify-between h-48 gap-3">
                <div className="w-full h-12 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-20 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-28 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-44 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-20 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-24 bg-gray-300 rounded-t-lg"></div>
                <div className="w-full h-28 bg-gray-300 rounded-t-lg"></div>
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-2xl text-gray-400">一</span>
                <span className="text-2xl text-gray-400">二</span>
                <span className="text-2xl text-gray-400">三</span>
                <span className="text-2xl text-gray-400">四</span>
                <span className="text-2xl text-gray-400">五</span>
                <span className="text-2xl text-gray-400">六</span>
                <span className="text-2xl text-gray-400">日</span>
              </div>
              <div className="absolute left-6 right-6 top-32 h-2 bg-orange-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🔥</span>
                <span className="text-3xl font-bold text-orange-500">步数</span>
              </div>
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-[46px] font-semibold text-black leading-tight mb-8">
              今天此刻你的步数正常。
            </p>
            <div className="border-t border-gray-200 pt-8">
              <div className="flex justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
                  <span className="text-3xl font-semibold text-orange-500">今天</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                  <span className="text-3xl font-semibold text-gray-400">平均</span>
                </div>
              </div>
              <div className="flex justify-between mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-[72px] font-bold text-orange-500">5,206</span>
                  <span className="text-3xl text-orange-500">步</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[72px] font-bold text-gray-400">5,039</span>
                  <span className="text-3xl text-gray-400">步</span>
                </div>
              </div>
              <div className="h-64 relative">
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2">
                  <div className="flex-1 h-8 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-10 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-14 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-20 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-28 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-36 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-44 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-52 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-48 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-52 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-56 bg-orange-500 rounded-t-lg"></div>
                  <div className="flex-1 h-56 bg-orange-500 rounded-t-lg"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2">
                  <div className="flex-1 h-6 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-8 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-12 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-18 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-24 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-28 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-32 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-36 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-32 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-36 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-40 bg-gray-200 rounded-t-lg"></div>
                  <div className="flex-1 h-40 bg-gray-200 rounded-t-lg"></div>
                </div>
                <div className="absolute inset-x-0 top-1/3 h-px bg-gray-200"></div>
              </div>
              <div className="flex justify-between mt-4">
                <span className="text-3xl text-gray-400">00:00</span>
                <span className="text-3xl text-gray-400">16:00</span>
                <span className="text-3xl text-gray-400">00:00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🎧</span>
                <span className="text-3xl font-bold text-blue-500">耳机音量</span>
              </div>
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-[46px] font-semibold text-black leading-tight">
              你今年的耳机音量比去年高 90 分贝。
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-4 right-4">
        <div className="bg-white rounded-[32px] p-2 shadow-2xl flex">
          <button className="flex-1 py-4 px-6 flex flex-col items-center rounded-2xl">
            <span className="text-5xl mb-1">💙</span>
            <span className="text-2xl font-semibold text-blue-500">摘要</span>
          </button>
          <button className="flex-1 py-4 px-6 flex flex-col items-center rounded-2xl">
            <span className="text-5xl mb-1">👥</span>
            <span className="text-2xl font-semibold text-black">共享</span>
          </button>
        </div>
      </div>
    </div>
  )
}
