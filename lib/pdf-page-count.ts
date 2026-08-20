/**
 * 从 PDF 二进制读取页数（用于 OCR 上传按页计费；不解析版式，仅读元数据）
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  // 中文注释：优先使用 pdf-parse（速度快），失败则回退到 pdfjs-dist（兼容性更好）
  try {
    const pdfParse = (await import('pdf-parse')).default as (
      data: Buffer
    ) => Promise<{ numpages: number }>;
    const data = await pdfParse(buffer);
    const pages = data?.numpages ?? 0;
    if (Number.isFinite(pages) && pages > 0) return pages;
  } catch {
    // continue to fallback
  }

  // 中文注释：pdfjs-dist 读取页数更稳健（可处理部分 pdf-parse 不支持的 PDF 结构）
  try {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.js')) as unknown as {
      getDocument: (src: { data: Uint8Array }) => { promise: Promise<{ numPages: number }> };
    };

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const doc = await loadingTask.promise;
    const pages = doc?.numPages ?? 0;
    if (!Number.isFinite(pages) || pages <= 0) {
      throw new Error('PDF 页数读取失败')
    }
    return pages;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF 页数读取失败';
    // 中文注释：如果是加密/需要密码的 PDF，这里通常会抛类似 “PasswordException”
    if (/password|encrypted|PasswordException/i.test(message)) {
      throw new Error('该 PDF 已加密或需要密码，无法读取页数');
    }
    throw new Error('无法读取 PDF 页数，请确认文件未损坏');
  }
}
