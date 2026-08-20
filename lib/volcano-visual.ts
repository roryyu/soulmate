import crypto from 'crypto';

/**
 * 火山引擎视觉 API 配置接口
 */
export interface VolcanoVisualConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
}

/**
 * PDF/图片解析请求参数
 */
export interface OCRPdfParams {
  /** 文件的 Base64 编码（与 image_url 二选一） */
  image_base64?: string;
  /** 文件的 URL 链接（与 image_base64 二选一） */
  image_url?: string;
  /** 文件类型："pdf" | "image"，默认为 "pdf" */
  file_type?: 'pdf' | 'image';
  /** PDF 从第几页开始解析，默认为 0 */
  page_start?: number;
  /** PDF 解析页数，默认为 16，最多支持 300 页 */
  page_num?: number;
  /** 文本解析模式："auto" | "ocr"，默认为 "auto" */
  parse_mode?: 'auto' | 'ocr';
  /** 表格返回格式："html" | "markdown"，默认为 "markdown" */
  table_mode?: 'html' | 'markdown';
  /** 页眉、页脚、脚注过滤开关："true" | "false"，默认为 "true" */
  filter_header?: 'true' | 'false';
}

/** 火山 OCRPdf 单页内文字块（坐标等与 API 一致，此处仅保留常用字段） */
export interface OCRPdfTextBlock {
  text?: string;
  label?: string;
  is_bold?: boolean;
  is_italic?: boolean;
  font_size?: number;
  box?: Record<string, number>;
  norm_box?: Record<string, number>;
}

/**
 * 逐页结构化信息（与 OCRPdf API 返回的 detail 数组元素一致，见 test-visual-result.json）
 */
export interface OCRPdfPageDetail {
  /** API 返回的页索引，从 0 开始 */
  page_id?: number;
  /** 该页完整 Markdown */
  page_md?: string;
  page_image_hw?: { h: number; w: number };
  textblocks?: OCRPdfTextBlock[];
}

/**
 * PDF/图片解析响应结果
 */
export interface OCRPdfResult {
  /** Markdown 格式的整篇解析结果（无分页标记时的兜底） */
  markdown: string;
  /** 逐页结构化信息 */
  detail: OCRPdfPageDetail[];
}

/**
 * 将 API 返回的 detail 规范为逐页数组（兼容 detail 为 JSON 字符串）
 */
export function normalizeOcrDetail(raw: unknown): OCRPdfPageDetail[] {
  if (raw == null) {
    return [];
  }
  if (typeof raw === 'string') {
    try {
      return normalizeOcrDetail(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as OCRPdfPageDetail[];
}

/**
 * 将 OCR 结果按页拼接为带页码标记的全文 Markdown，供入库与大模型引用页码
 */
export function formatOcrContentWithPages(result: OCRPdfResult): string {
  const pages = normalizeOcrDetail(result.detail);
  const hasPageMd = pages.some(
    (p) => typeof p.page_md === 'string' && p.page_md.trim().length > 0
  );
  // 无分页正文时退回整篇 markdown
  if (!hasPageMd) {
    return result.markdown?.trim() ? result.markdown : '';
  }

  const sorted = [...pages].sort((a, b) => (a.page_id ?? 0) - (b.page_id ?? 0));
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const md = p.page_md?.trim() ?? '';
    if (!md) {
      continue;
    }
    // page_id 为 0-based，展示用 1-based；缺失时用当前排序位置
    const pageNum = p.page_id != null ? p.page_id + 1 : i + 1;
    parts.push(`## 第 ${pageNum} 页\n\n${md}`);
  }
  return parts.join('\n\n---\n\n');
}

/**
 * 视觉 API 操作错误类型
 */
export class VolcanoVisualError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'VolcanoVisualError';
  }
}

/**
 * 获取视觉 API 配置
 * 从环境变量中读取配置
 */
function getVisualConfig(): VolcanoVisualConfig {
  const accessKeyId = process.env.VISUAL_ACCESS_KEY_ID;
  const accessKeySecret = process.env.VISUAL_ACCESS_KEY_SECRET;
  const region = process.env.VISUAL_REGION || 'cn-north-1';

  if (!accessKeyId) {
    throw new Error('Missing VISUAL_ACCESS_KEY_ID environment variable');
  }
  if (!accessKeySecret) {
    throw new Error('Missing VISUAL_ACCESS_KEY_SECRET environment variable');
  }

  return {
    accessKeyId,
    accessKeySecret,
    region,
  };
}

/**
 * 生成签名
 * 用于火山引擎 API 鉴权
 */
function generateSignature(params: {
  accessKeySecret: string;
  method: string;
  canonicalURI: string;
  canonicalQueryString: string;
  canonicalHeaders: string;
  signedHeaders: string;
  payloadHash: string;
  shortDate: string;
  longDate: string;
  region: string;
  service: string;
}): string {
  const { accessKeySecret, method, canonicalURI, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash, shortDate, longDate, region, service } = params;

  const canonicalRequest = [
    method,
    canonicalURI,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${shortDate}/${region}/${service}/request`;

  const stringToSign = [
    'HMAC-SHA256',
    longDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const kDate = crypto.createHmac('sha256', accessKeySecret).update(shortDate).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const signingKey = crypto.createHmac('sha256', kService).update('request').digest();

  return crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
}

/**
 * 格式化日期为 YYYYMMDD
 */
function formatShortDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('T')[0];
}

/**
 * 格式化日期为 YYYYMMDD'T'HHMMSS'Z'
 */
function formatLongDate(date: Date): string {
  const isoStr = date.toISOString();
  const datePart = isoStr.replace(/[-:]/g, '').split('T')[0];
  const timePart = isoStr.split('T')[1].split('.')[0].replace(/:/g, '');
  return `${datePart}T${timePart}Z`;
}

/**
 * 对字符串进行 URL 编码
 */
function urlEncode(str: string): string {
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
}

/**
 * 规范化 URI 路径
 */
function normUri(path: string): string {
  return encodeURIComponent(path).replace(/%2F/g, '/').replace(/\+/g, '%20');
}

/**
 * 解析 PDF 或图片文件
 * 支持对数字扫描版 PDF、图片进行深度解析和结构化处理
 * @param params 解析参数
 * @returns 解析结果（Markdown 格式和结构化信息）
 */
export async function ocrPdf(params: OCRPdfParams): Promise<OCRPdfResult> {
  const config = getVisualConfig();
  const now = new Date();
  const shortDate = formatShortDate(now);
  const longDate = formatLongDate(now);
  const service = 'cv';

  const host = 'visual.volcengineapi.com';
  const endpoint = `https://${host}`;

  const bodyParams = new URLSearchParams();

  // 版本号为必填参数，固定为 v3
  bodyParams.append('version', 'v3');

  if (params.image_base64) {
    bodyParams.append('image_base64', params.image_base64);
  }
  if (params.image_url) {
    bodyParams.append('image_url', params.image_url);
  }
  if (params.file_type) {
    bodyParams.append('file_type', params.file_type);
  }
  if (params.page_start !== undefined) {
    bodyParams.append('page_start', params.page_start.toString());
  }
  if (params.page_num !== undefined) {
    bodyParams.append('page_num', params.page_num.toString());
  }
  if (params.parse_mode) {
    bodyParams.append('parse_mode', params.parse_mode);
  }
  if (params.table_mode) {
    bodyParams.append('table_mode', params.table_mode);
  }
  if (params.filter_header) {
    bodyParams.append('filter_header', params.filter_header);
  }

  const payload = bodyParams.toString();
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

  // 处理 host 头部，移除默认端口
  let hostHeader = host;
  if (hostHeader.includes(':')) {
    const [hostname, port] = hostHeader.split(':');
    if (port === '80' || port === '443') {
      hostHeader = hostname;
    }
  }

  // 构建 canonicalHeaders，按字母顺序排序
  const canonicalHeaders = [
    `content-type:application/x-www-form-urlencoded`,
    `host:${hostHeader}`,
    `x-date:${longDate}`,
  ].map(header => header.trim()).sort().join('\n') + '\n';

  // signedHeaders 也需要按字母顺序排序
  const signedHeaders = 'content-type;host;x-date';

  // 构建查询参数并排序
  const queryParams = new URLSearchParams();
  queryParams.append('Action', 'OCRPdf');
  queryParams.append('Version', '2021-08-23');
  
  // 转换为字符串并替换 '+' 为 '%20'
  let canonicalQueryString = queryParams.toString().replace(/\+/g, '%20');
  
  // 如果没有查询参数，设置为空字符串
  if (canonicalQueryString === '') {
    canonicalQueryString = '';
  }

  const signature = generateSignature({
    accessKeySecret: config.accessKeySecret,
    method: 'POST',
    canonicalURI: normUri('/'),
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
    shortDate,
    longDate,
    region: config.region,
    service,
  });

  const authorization = `HMAC-SHA256 Credential=${config.accessKeyId}/${shortDate}/${config.region}/${service}/request, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const response = await fetch(`${endpoint}?Action=OCRPdf&Version=2021-08-23`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Date': longDate,
        'Authorization': authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('========== API 错误详情 ==========');
      console.error(`状态码: ${response.status} ${response.statusText}`);
      console.error(`错误 Body: ${errorBody}`);
      console.error('==================================');
      throw new VolcanoVisualError(
        `视觉 API 请求失败: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const data = await response.json() as { data?: OCRPdfResult; Message?: string; Code?: string };

    if (data.Message || data.Code) {
      throw new VolcanoVisualError(
        `视觉 API 返回错误: ${data.Message || data.Code}`,
        undefined,
        JSON.stringify(data)
      );
    }

    const raw = data.data ?? { markdown: '', detail: [] };
    // 统一规范化 detail，避免字符串/结构不一致导致下游解析失败
    return {
      markdown: raw.markdown ?? '',
      detail: normalizeOcrDetail(raw.detail),
    };
  } catch (error) {
    if (error instanceof VolcanoVisualError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new VolcanoVisualError(`视觉 API 请求异常: ${error.message}`);
    }
    throw new VolcanoVisualError(`视觉 API 请求异常: ${String(error)}`);
  }
}

/**
 * 将本地文件转换为 Base64
 * @param filePath 文件路径
 * @returns Base64 编码字符串
 */
export async function fileToBase64(filePath: string): Promise<string> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

/**
 * 从 URL 下载文件并转为 Base64
 * @param url 文件 URL
 * @returns Base64 编码字符串
 */
export async function fetchFileToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new VolcanoVisualError(`下载文件失败: ${response.status} ${response.statusText}`, response.status);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
