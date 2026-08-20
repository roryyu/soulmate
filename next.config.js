/** @type {import('next').NextConfig} */
const nextConfig = {
  // 云构建若未安装 devDependencies，next lint 会找不到 eslint-config-next；生产构建以类型检查为主，CI 可单独跑 lint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ByteFaaS 等只读/无 .next/cache 时，Image Optimizer 写磁盘会 ENOENT：在平台设置 NEXT_DISABLE_IMAGE_OPTIMIZATION=1
  // 未设置该变量时保持默认优化（需运行时能 mkdir .next/cache/images，且建议安装 sharp）
  images: {
    unoptimized: process.env.NEXT_DISABLE_IMAGE_OPTIMIZATION === '1',
  },
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'pdfjs-dist', 'mammoth'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'pdfjs-dist']
    }
    return config
  },
  // Next.js 14 已废弃 api 配置项
  // - 流式响应默认支持
  // - bodyParser 可在具体路由中配置 export const dynamic = 'force-dynamic'
}

module.exports = nextConfig