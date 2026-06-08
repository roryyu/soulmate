function Footer() {
  return (
    <footer className="bg-white border-t border-[#ebebeb]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2" />

          <p className="text-[13px] text-[#6a6a6a]">
            © 2026 Soulmates荣誉出品 |{' '}
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#222222] underline hover:text-[#ff385c] transition-colors"
            >
              沪ICP备XXXXXXXX号
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
