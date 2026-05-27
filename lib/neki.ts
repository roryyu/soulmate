/**
 * CNKI（中国知网）文献检索模块
 * 提供文献搜索和参考文献格式化功能
 */
import https from 'https';

// ==================== 常量定义 ====================

/** CNKI API 主机名 */
const CNKI_API_HOST = 'wap.cnki.net';
/** CNKI API 搜索路径 */
const CNKI_SEARCH_PATH = '/gate/m052/web/api/article/search';
/** CNKI 网站主机名（用于请求头） */
const CNKI_WEB_HOST = 'wap.cnki.net';

/** HTTP 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 10000;

/** 默认搜索页大小 */
const DEFAULT_PAGE_SIZE = 1;
/** 默认页码 */
const DEFAULT_PAGE_INDEX = 1;
/** 主题字段类型 */
const FIELD_TYPE_SUBJECT = 101;

/** User-Agent 池（用于随机选择，避免被反爬） */
const USER_AGENT_POOL = [
    'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
    `Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.${Math.floor(Math.random() * 1453)}.94 Safari/${Math.floor(Math.random() * 537)}.36`,
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.${Math.floor(Math.random() * 1453)}.93 Safari/${Math.floor(Math.random() * 537)}.36`,
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko)Ubuntu/11.10 Chromium/27.0.${Math.floor(Math.random() * 1453)}.93 Chrome/27.0.${Math.floor(Math.random() * 1453)}.93 Safari/${Math.floor(Math.random() * 537)}.36`
];

/** 文章类型映射表：中文名称 -> GB/T 7714 引用格式标识 */
const ARTICLE_TYPE_MAP: Record<string, string> = {
    '期刊文章(Journal)': 'J',
    '标准(Standard)': 'S',
    '专著(Monograph)': 'M',
    '报纸文章(Newspaper)': 'N',
    '论文集（ConferenncePrceeding)': 'C',
    '报告(Report)': 'R',
    '学位论文(Dissertation)': 'D',
    '其它文献(Z)': 'Z',
    '专利(Patent)': 'P',
};

// ==================== 接口定义 ====================

interface Headers {
    [key: string]: string;
}

interface RequestOptions {
    hostname: string;
    path: string;
    method: string;
    headers: Headers;
}

/** 筛选参数 */
interface ScreenParams {
    screentype: number;
    isscreen: string;
    subject_sc: string;
    research_sc: string;
    depart_sc: string;
    author_sc: string;
    subjectcode_sc: string;
    researchcode_sc: string;
    departcode_sc: string;
    authorcode_sc: string;
    sponsor_sc: string;
    teacher_sc: string;
    sponsorcode_sc: string;
    teachercode_sc: string;
    starttime_sc: string;
    endtime_sc: string;
    timestate_sc: string;
}

/** 高级检索参数 */
interface SeniorParams {
    theme_kw: string;
    title_kw: string;
    full_kw: string;
    author_kw: string;
    depart_kw: string;
    key_kw: string;
    abstract_kw: string;
    source_kw: string;
    teacher_md: string;
    catalog_md: string;
    depart_md: string;
    refer_md: string;
    name_meet: string;
    collect_meet: string;
}

/** 搜索请求体 */
interface RequestBody {
    keyword: string;
    searchType: number;
    dbType: string;
    pageIndex: number;
    pageSize: number;
    articletype: number;
    sorttype: number;
    fieldtype: number;
    yeartype: number;
    remark: string;
    yearinterval: string;
    screen: ScreenParams;
    senior: SeniorParams;
}

/** HTTP 响应数据 */
interface ResponseData {
    statusCode: number | undefined;
    headers: any;
    data: any;
}

/** 从文本提取的基本信息 */
interface BasicInfo {
    title: string;
    author: string;
    volume: string;
    issue: string;
    year: string;
    uuid: string;
}

// ==================== 缓存 ====================

/** 文章搜索结果缓存（key: uuid, value: 文章数据） */
// 使用全局缓存以确保跨请求持久化
const globalForCache = globalThis as unknown as {
  cnkiCache: Map<string, any> | undefined;
};

export const cache = globalForCache.cnkiCache ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.cnkiCache = cache;
}

// ==================== 工具函数 ====================

/**
 * 生成随机请求头
 * @returns 包含基础 HTTP 请求头的对象
 */
function getHeader(): Headers {
    const userAgent = USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];

    return {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "Host": CNKI_WEB_HOST,
        "Proxy-Connection": "keep-alive",
        "Upgrade-Insecure-Requests": '1',
        "User-Agent": userAgent
    };
}

/**
 * 发送 HTTPS 请求
 * @param options 请求选项
 * @param data 请求体数据
 * @returns 响应数据 Promise
 */
function httpsRequest(options: RequestOptions, data: any = null): Promise<ResponseData> {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        // 设置超时
        req.setTimeout(REQUEST_TIMEOUT_MS, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        // 发送请求体（如果有）
        if (data) {
            if (typeof data === 'object') {
                req.write(JSON.stringify(data));
            } else {
                req.write(data);
            }
        }

        req.end();
    });
}

/**
 * 获取字符串的第一个段落（按空白字符分割）
 * @param str 输入字符串
 * @returns 第一个非空白段落
 */
function getFirstSegment(str: string): string {
    if (!str || typeof str !== 'string') {
        return str || '';
    }

    // 支持多种空白字符：空格、制表符、换行等
    const segments = str.split(/\s+/);
    return segments[0] || '';
}

/**
 * 在 CNKI 中搜索文章
 * @param title 文章标题
 * @param author 作者名
 * @returns 搜索结果中的第一篇文章数据，未找到则返回 null
 */
async function searchCNKIArticle(title: string, author: string): Promise<any> {
    const headers: Headers = {
        ...getHeader(),
        "accept": "application/json",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "Referer": `https://wap.cnki.net/touch/web/Article/Search?kw=${encodeURIComponent(title)}&field=${FIELD_TYPE_SUBJECT}`
    };

    const options: RequestOptions = {
        hostname: CNKI_API_HOST,
        path: CNKI_SEARCH_PATH,
        method: 'POST',
        headers: headers
    };

    const body: RequestBody = {
        "keyword": getFirstSegment(title),
        "searchType": 0,
        "dbType": "",
        "pageIndex": DEFAULT_PAGE_INDEX,
        "pageSize": DEFAULT_PAGE_SIZE,
        "articletype": 0,
        "sorttype": 0,
        "fieldtype": FIELD_TYPE_SUBJECT,
        "yeartype": 0,
        "remark": "",
        "yearinterval": "",
        "screen": {
            "screentype": 0,
            "isscreen": "",
            "subject_sc": "",
            "research_sc": "",
            "depart_sc": "",
            "author_sc": "",
            "subjectcode_sc": "",
            "researchcode_sc": "",
            "departcode_sc": "",
            "authorcode_sc": "",
            "sponsor_sc": "",
            "teacher_sc": "",
            "sponsorcode_sc": "",
            "teachercode_sc": "",
            "starttime_sc": "",
            "endtime_sc": "",
            "timestate_sc": ""
        },
        "senior": {
            "theme_kw": "",
            "title_kw": "",
            "full_kw": "",
            "author_kw": getFirstSegment(author),
            "depart_kw": "",
            "key_kw": "",
            "abstract_kw": "",
            "source_kw": "",
            "teacher_md": "",
            "catalog_md": "",
            "depart_md": "",
            "refer_md": "",
            "name_meet": "",
            "collect_meet": ""
        }
    };

    try {
        const response = await httpsRequest(options, body);       
        if (response.statusCode === 200 && 
            response.data && 
            response.data.errorCode === '1' && 
            response.data.contentList && 
            response.data.contentList.length > 0) {
            return response.data.contentList[0];
        }
        console.error('Error in searchCNKIArticle function:', response);
        return null;
    } catch (error) {
        console.error('Error in searchCNKIArticle function:', error);
        throw error;
    }
}

/**
 * Base64 编码
 * @param str 输入字符串
 * @returns Base64 编码后的字符串
 */
function btoa(str: string): string {
    return Buffer.from(str, 'binary').toString('base64');
}

/**
 * 根据标题和作者生成简化 UUID
 * 用于生成唯一的缓存键
 * @param str1 标题
 * @param str2 作者
 * @returns UUID 格式字符串
 */
function simpleUUID(str1: string, str2: string): string {
    // 组合数据
    const data = `${str1}|${str2}`;

    // 转换为 Base64（处理 UTF-8 编码）
    const base64 = btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    }));

    // 生成十六进制
    let hex = '';
    for (let i = 0; i < base64.length; i++) {
        hex += base64.charCodeAt(i).toString(16).padStart(2, '0');
    }

    // 确保足够长度
    while (hex.length < 32) {
        hex += hex;
    }

    // 格式化为 UUID（版本 4 格式）
    const hex32 = hex.substring(0, 32);
    return [
        hex32.substring(0, 8),
        hex32.substring(8, 12),
        '4' + hex32.substring(13, 16),
        ((parseInt(hex32.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hex32.substring(17, 20),
        hex32.substring(20, 32)
    ].join('-');
}

/**
 * 根据文章类型获取 GB/T 7714 引用格式标识
 * @param type 文章类型字符串
 * @returns 引用格式标识，如 [J]、[M] 等
 */
function getArticleType(type: any): string {
    let result = 'Z';
    
    for (const key in ARTICLE_TYPE_MAP) {
        const pattern = new RegExp(type);
        if (pattern.test(key)) {
            result = ARTICLE_TYPE_MAP[key];
            break;
        }
    }
    
    return `[${result}]`;
}

/**
 * 从字符串中提取数字
 * @param str 输入字符串
 * @returns 仅包含数字的字符串
 */
function getNumber(str: string): string {
    return str ? str.replace(/\D/g, '') : '';
}

/**
 * 从格式化文本中提取标题和作者信息
 * 支持格式：《标题》- 作者 - 卷 - 期 - 年
 * @param text 格式化文本
 * @returns 提取的基本信息对象，解析失败返回 null
 */
function extractTitleAndAuthor(text: string): BasicInfo | null {
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 查找《标题》- 作者 格式的行
        const match = trimmedLine.match(/^《([^》]+)》\s*-\s*([^\n\r]+)$/);

        if (match) {
            const title = match[1].trim();
            const others = match[2].split(' - ');
            const author = others[0].trim();
            const volume = getNumber(others[1] || '');
            const issue = getNumber(others[2] || '');
            const year = getNumber(others[3] || '');

            const uuid = simpleUUID(title, author);
            return {
                title,
                author,
                volume,
                issue,
                year,
                uuid
            };
        }
    }

    return null;
}

/**
 * 格式化作者名称（分号和空格替换为逗号）
 * @param author 作者字符串（可能包含分号分隔）
 * @returns 格式化后的作者字符串
 */
function formatAuthor(author: string): string {
    return author.replace(/;/g, ' ').trim().split(' ').join(',');
}

// ==================== 导出函数 ====================

/**
 * 根据文献信息生成参考文献引用格式
 * @param txt 格式化的文献信息文本
 * @returns 参考文献引用格式字符串
 */
export async function getReference(txt: string): Promise<string> {
    const basicInfo = extractTitleAndAuthor(txt);
    let article = null;
    let reference = '';
    
    //console.log(basicInfo);
    
    if (basicInfo) {
        // 先检查缓存
        if (cache.has(basicInfo.uuid)) {
            console.log('缓存命中:', basicInfo.uuid);
            article = cache.get(basicInfo.uuid);
        } else {
            // 搜索文章并缓存结果
            article = await searchCNKIArticle(basicInfo.title, basicInfo.author);

            // 缓存搜索结果
            if (article) {
                cache.set(basicInfo.uuid, article);
            }       
        }
    }
    
    
    
    // 未在 CNKI 找到文章，使用基本信息生成引用
    if (basicInfo && !article) {
        reference = `\n\n## 注意\n\n引用这篇文章请使用此段文字：${formatAuthor(basicInfo.author)}.${basicInfo.title}[Z],${basicInfo.year},${basicInfo.volume || ''}(${basicInfo.issue || ''})`;
    }
    
    // 找到文章，使用 CNKI 数据生成引用
    if (basicInfo && article) {
        const pages = article.page.split('-');
        let page = '';
        if (pages.length > 0) {
            page = `${pages[0] - 2}-${pages[1] - 2}`;
        }
        reference = `\n\n## 注意\n\n引用这篇文章请使用此段文字：${formatAuthor(article.author)}.${article.title}${getArticleType(article.dBFrom)}.${article.publishName},${article.year},${basicInfo.volume || ''}(${article.period || ''}):${page}.`;
    }
    
    return reference;
}
