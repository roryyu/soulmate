import React, { useEffect, useRef, useState, useCallback } from "react"
import { loadMJS } from './load-mjs';
import './pdfjs-dist/web/pdf_viewer.css';
import './pdf-viewer.css'

// 声明window上的pdfjsLib属性以解决类型报错
declare global {
  interface Window {
    pdfjsLib: any;
    pdfjsViewer: any;
  }
}

/**
 * PDFViewer组件属性接口
 */
interface PDFViewerProps {
  /** PDF 文件 URL 或数据 */
  file: string | Uint8Array | ArrayBuffer;
  /** 缩放比例 */
  scale?: number;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否启用文本选择 */
  enableTextSelection?: boolean;
  /** 是否启用懒加载（仅渲染可见页面） */
  lazyLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 搜索事件 */
  searchEvent?: { type: string; query: string } | null;
}

/**
 * PDF页面组件属性接口
 */
interface PageCanvasProps {
  /** 渲染页面的回调函数 */
  renderPage: (canvas: HTMLDivElement) => Promise<void>;
}

/**
 * PDF页面渲染组件
 */
const PageCanvas: React.FC<PageCanvasProps> = ({ renderPage }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (!isLoaded.current) {
      isLoaded.current = true;
      if (canvasRef.current) {
        renderPage(canvasRef.current);
      }
    }
  }, [renderPage]);

  return (
    <div ref={canvasRef} className="pdfViewer-container">
      <div className="pdfViewer"></div>
    </div>
  );
};

/**
 * PDF查看器主组件
 */
export default function PDFViewer({
  file,
  scale = 1.0,
  showToolbar = true,
  enableTextSelection = true,
  lazyLoading = true,
  searchEvent = null,
  className = '',
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentScale, setCurrentScale] = useState(scale);
  const isLoaded = useRef(false);

  // 用于存储PDF.js查看器实例的引用
  const pdfjsViewerRef = useRef<any>(null);
  const eventBusRef = useRef<any>(null);

  // 处理搜索事件
  useEffect(() => {
    if (searchEvent && eventBusRef.current) {
      eventBusRef.current.dispatch("find", {
        caseSensitive: false,
        findPrevious: undefined,
        highlightAll: true,
        phraseSearch: true, 
        query: searchEvent.query
      });
    }
  }, [searchEvent]);

  // 加载PDF文档
  useEffect(() => {
    if (!isLoaded.current) {
      isLoaded.current = true;
      loadMJS('/pdfjs.bundle.js')
        .then(() => {
          const pdfjsLib = window.pdfjsLib;
          const loadingTask = pdfjsLib.getDocument({
            url: file,
            cMapUrl: pdfjsLib.CMAP_URL,
            cMapPacked: pdfjsLib.CMAP_PACKED,
            enableXfa: pdfjsLib.ENABLE_XFA,
          });

          loadingTask.promise
            .then((pdf: any) => {
              setPdfDoc(pdf);
              setNumPages(pdf.numPages);
              setLoading(false);
            })
            .catch((err: any) => {
              setError(err.message || '加载 PDF 失败');
              setLoading(false);
              loadingTask.destroy();
            });
        })
        .catch((err: any) => {
          setError('加载 PDF.js 失败');
          setLoading(false);
        });
    }
  }, [file]);

  // 渲染PDF页面
  const renderPage = useCallback(
    async (canvas: HTMLDivElement) => {
      if (!pdfDoc) return;

      try {
        const pdfjsViewer = window.pdfjsViewer;
        const eventBus = new pdfjsViewer.EventBus();

        // 启用PDF文件内的超链接
        const pdfLinkService = new pdfjsViewer.PDFLinkService({
          eventBus,
        });

        // 启用查找控制器
        const pdfFindController = new pdfjsViewer.PDFFindController({
          eventBus,
          linkService: pdfLinkService,
        });

        // 启用脚本支持
        const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({
          eventBus,
          sandboxBundleSrc: window.pdfjsLib.SANDBOX_BUNDLE_SRC,
        });

        // 创建PDFViewer实例
        const pdfViewer = new pdfjsViewer.PDFViewer({
          container: canvas,
          eventBus,
          linkService: pdfLinkService,
          findController: pdfFindController,
          scriptingManager: pdfScriptingManager,
        });

        pdfLinkService.setViewer(pdfViewer);
        pdfScriptingManager.setViewer(pdfViewer);

        // 页面初始化完成后设置默认缩放比例
        eventBus.on("pagesinit", function () {
          pdfViewer.currentScaleValue = "page-width";
        });

        // 设置文档
        pdfViewer.setDocument(pdfDoc);
        pdfLinkService.setDocument(pdfDoc, null);

        // 保存引用以便外部调用
        pdfjsViewerRef.current = pdfViewer;
        eventBusRef.current = eventBus;
      } catch (err) {
        console.error('渲染页面失败:', err);
      }
    },
    [pdfDoc, currentScale, enableTextSelection]
  );

  // 加载状态
  if (loading) {
    return (
      <div className={`pdf-container ${className}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>正在加载 PDF...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`pdf-container ${className}`}>
        <div className="error-container">
          <h3>加载失败</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-container ${className}`}>
      {/* PDF 页面 */}
      <div className="pdf-pages-wrapper" ref={containerRef}>
        <div className="pdfViewer-container-outer">
          <PageCanvas renderPage={renderPage} />
        </div>
      </div>
    </div>
  );
}

