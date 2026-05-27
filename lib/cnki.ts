import https from 'https';

// 常量定义
const CNKI_BASE_URL = 'kns.cnki.net';
const LOGIN_URL = 'login.cnki.net';
const SEARCH_PATH = '/kns8s/brief/grid';
const EXPORT_PATH = '/dm8/API/GetExport';
const LOGIN_PATH = '/TopLoginCore/api/loginapi/LoginPo';
const REFERER_SEARCH = 'https://kns.cnki.net/kns8s/AdvSearch';
const REFERER_BASE = 'https://kns.cnki.net/';
const GBT_REFER_MODE = 'GBTREFER';
const CACHE_KEY_ECP_CLIENT_ID = 'ecpClientId';

// 正则表达式常量
const TITLE_AUTHOR_PATTERN = /^《([^》]+)》\s*-\s*([^\n\r]+)$/;
const TOTAL_MATCH_PATTERN = /<em>([\d,]+)<\/em>/;
const TITLE_PATTERN = /class="fz14"[^>]*>(.+?)<\/a>/s;
const HREF_PATTERN = /class="fz14"[^>]*href="([^"]*)"/;
const ABSTRACT_V_PATTERN = /abstract\?v=(.+)$/;
const FILEID_PATTERN = /data-filename="([^"]+)"/;
const DBNAME_PATTERN = /data-dbname="([^"]+)"/;
const DATE_PATTERN = /class="date">([^<]+)</;
const AUTHOR_PATTERN = /class='author'>(.*?)<\/td>/s;
const SOURCE_PATTERN = /class="source">(.*?)<\/td>/s;
const QUOTE_COUNT_PATTERN = /class="quoteCnt"[^>]*>(\d+)<\/a>/;
const DOWNLOAD_COUNT_PATTERN = /class="downloadCnt"[^>]*>(\d+)<\/a>/;
const DATA_TYPE_PATTERN = /class="data">\s*<span>([^<]+)<\/span>/;
const RESOURCE_PATTERN = /data-resource="([^"]+)"/;
const COOKIE_NAME_PATTERN = /name="CookieName"[^>]*value="([^"]*)"/;

// 接口定义
interface HttpsRequestOptions extends https.RequestOptions {
  headers?: Record<string, string>;
}

interface HttpsResponse {
  statusCode: number | undefined;
  headers: any;
  data: any;
}

interface BasicInfo {
  title: string;
  author: string;
  uuid: string;
}

interface Article {
  title: string;
  author: string;
  source: string;
  date: string;
  fileid: string;
  dbname: string;
  articleV: string;
  quoteCount: number;
  downloadCount: number;
  dataType: string;
  resource: string;
  CookieName: string;
}

interface SearchResults {
  total: number;
  articles: Article[];
}

interface ArticleItem {
  key: string;
  mode: string;
  value: any;
}

// 缓存管理
const globalForCache = globalThis as unknown as {
  cnkiCache: Map<string, any> | undefined;
};

export const cache = globalForCache.cnkiCache ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.cnkiCache = cache;
}

// HTTPS请求封装函数
/**
 * 发送HTTPS请求
 * @param options 请求配置
 * @param data 请求体数据
 * @returns 响应结果
 */
function httpsRequest(options: HttpsRequestOptions, data: any = null): Promise<HttpsResponse> {
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
          // 如果解析JSON失败，返回原始字符串
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

    // 设置10秒超时
    req.setTimeout(10000, () => {
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
 * 获取CNKI导出数据
 * @param filename 文件名
 * @param ecpClientId 客户端ID
 * @returns 导出数据
 */
async function search(filename: string, ecpClientId: string): Promise<any> {
  const displayMode = 'GBTREFER%2CMLA%2CAPA';
  const uniplatform = 'NZKPT';
  const postData = `filename=${filename}&displaymode=${displayMode}&uniplatform=${uniplatform}`;

  const options: HttpsRequestOptions = {
    hostname: CNKI_BASE_URL,
    port: 443,
    path: EXPORT_PATH,
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      'cookie': `Ecp_ClientId=${ecpClientId}`,
      'Referer': REFERER_BASE,
      'Content-Length': postData.length.toString()
    }
  };

  const response = await httpsRequest(options, postData);
  return response.statusCode === 200 ? response.data : null;
}

/**
 * 将JSON转换为form-data格式
 * @param json JSON数据
 * @returns form-data字符串
 */
function jsontoformdata(json: Record<string, any>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(json)) {
    params.append(key, value);
  }
  return params.toString();
}

/**
 * 解析搜索结果HTML
 * @param html HTML内容
 * @returns 解析后的搜索结果
 */
function parseSearchResults(html: string): SearchResults {
  const articles: Article[] = [];
  
  // 解析总条数
  const totalMatch = html.match(TOTAL_MATCH_PATTERN);
  const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;
  
  // 解析每一行数据
  const rows = html.split(/<tr>/g).slice(2);
  for (const row of rows) {
    const titleMatch = row.match(TITLE_PATTERN);
    if (!titleMatch) continue;
    
    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    const hrefMatch = row.match(HREF_PATTERN);
    const abstractUrl = hrefMatch ? hrefMatch[1].replace(/&amp;/g, '&') : '';
    const vMatch = abstractUrl.match(ABSTRACT_V_PATTERN);
    const articleV = `https://${CNKI_BASE_URL}/kcms2/article/abstract?v=${vMatch ? vMatch[1] : ''}`;
    
    const fileidMatch = row.match(FILEID_PATTERN);
    const dbnameMatch = row.match(DBNAME_PATTERN);
    const dateMatch = row.match(DATE_PATTERN);
    const authorMatch = row.match(AUTHOR_PATTERN);
    const sourceMatch = row.match(SOURCE_PATTERN);
    const quoteMatch = row.match(QUOTE_COUNT_PATTERN);
    const downloadMatch = row.match(DOWNLOAD_COUNT_PATTERN);
    const dataTypeMatch = row.match(DATA_TYPE_PATTERN);
    const resourceMatch = row.match(RESOURCE_PATTERN);
    const CookieNameMatch = row.match(COOKIE_NAME_PATTERN);
    
    articles.push({
      title,
      author: authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      source: sourceMatch ? sourceMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      date: dateMatch ? dateMatch[1].trim() : '',
      fileid: fileidMatch ? fileidMatch[1] : '',
      dbname: dbnameMatch ? dbnameMatch[1] : '',
      articleV,
      quoteCount: quoteMatch ? parseInt(quoteMatch[1]) : 0,
      downloadCount: downloadMatch ? parseInt(downloadMatch[1]) : 0,
      dataType: dataTypeMatch ? dataTypeMatch[1].trim() : '',
      resource: resourceMatch ? resourceMatch[1] : '',
      CookieName: CookieNameMatch ? CookieNameMatch[1] : ''
    });
  }
  
  return { total, articles };
}

/**
 * 获取随机User-Agent头
 * @returns 请求头
 */
function getHeader(): Record<string, string> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
    `Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.${Math.floor(Math.random() * 1453)}.94 Safari/${Math.floor(Math.random() * 537)}.36`,
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.${Math.floor(Math.random() * 1453)}.93 Safari/${Math.floor(Math.random() * 537)}.36`,
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko)Ubuntu/11.10 Chromium/27.0.${Math.floor(Math.random() * 1453)}.93 Chrome/27.0.${Math.floor(Math.random() * 1453)}.93 Safari/${Math.floor(Math.random() * 537)}.36`
  ];
  
  return {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "Host": CNKI_BASE_URL,
    "Proxy-Connection": "keep-alive",
    "Upgrade-Insecure-Requests": '1',
    "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
  };
}

/**
 * 获取字符串的第一个片段
 * @param str 输入字符串
 * @returns 第一个片段
 */
function getFirstSegment(str: string): string {
  if (!str || typeof str !== 'string') {
    return str || '';
  }
  // 替换中文分隔符为空格
  str = str.trim().replace(/[、，；：]/g, ' ');
  // 按空白字符分割并返回第一个片段
  const segments = str.split(/\s+/);
  return segments[0] || '';
}

/**
 * 检查作者是否匹配
 * @param author 目标作者
 * @param articleAuthor 文章作者
 * @returns 是否匹配
 */
function checkAuthor(author: string, articleAuthor: string): boolean {
  return articleAuthor.includes(author);
}

/**
 * CNKI登录获取客户端ID
 * @returns 客户端ID
 */
async function login(): Promise<string | null> {
  const loginData = {
    userName: "yuchenlei99",
    pwd: "VuVq4GXXO6zHxl8oUJei+g==",
    isAutoLogin: true,
    p: 0,
    isEncry: 1,
    fingerprint: "ddf61d06a4cb5ad3b5817537e6899e23"
  };
  const requestBody = JSON.stringify(loginData);

  const options: HttpsRequestOptions = {
    hostname: LOGIN_URL,
    port: 443,
    path: LOGIN_PATH,
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'appid': 'LoginWap',
      'clientid': 'null',
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': REFERER_BASE,
      'Content-Length': Buffer.byteLength(requestBody).toString()
    }
  };

  const response = await httpsRequest(options, requestBody);
  const setCookieHeader = response.headers['set-cookie'];
  
  if (setCookieHeader) {
    const ecpClientIdCookie = setCookieHeader.find((cookie: string) => 
      cookie.startsWith('Ecp_ClientId=')
    );
    
    if (ecpClientIdCookie) {
      const ecpClientId = ecpClientIdCookie.split('=')[1].split(';')[0];
      console.log(`Ecp_ClientId值: ${ecpClientId}`);
      return ecpClientId;
    }
  }
  
  return null;
}

/**
 * 从字符串中提取数字
 * @param str 输入字符串
 * @returns 数字字符串
 */
function getNumber(str: string): string {
  return str ? str.replace(/\D/g, '') : '';
}

/**
 * 生成简单UUID
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns UUID
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
 * 从文本中提取标题和作者
 * @param text 输入文本
 * @returns 标题和作者信息
 */
function extractTitleAndAuthor(text: string): BasicInfo | null {
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(TITLE_AUTHOR_PATTERN);

    if (match) {
      const title = match[1].trim();
      const author = match[2].trim();
      const uuid = simpleUUID(title, author);
      
      return {
        title,
        author,
        uuid
      };
    }
  }

  return null;
}

/**
 * 请求CNKI搜索数据
 * @param title 文章标题
 * @param author 文章作者
 * @returns 搜索结果
 */
async function requestCNKI(title: string, author: string): Promise<any> {
  console.log('搜索参数:', { title, author });
  
  // 获取或登录获取Ecp_ClientId
  let ecpClientId = cache.get(CACHE_KEY_ECP_CLIENT_ID);
  
  if (!ecpClientId) {
    console.log('ecpClientId不存在，尝试登录获取');
    ecpClientId = await login();
    
    if (!ecpClientId) {
      return null;
    }
    
    cache.set(CACHE_KEY_ECP_CLIENT_ID, ecpClientId);
  }
  
  // 构建搜索请求参数
  const searchData = {
    boolSearch: true,
    QueryJson: JSON.stringify({
      "Platform": "",
      "Resource": "CROSSDB",
      "Classid": "WD0FTY92",
      "Products": "",
      "QNode": {
        "QGroup": [
          {
            "Key": "Subject",
            "Title": "",
            "Logic": 0,
            "Items": [],
            "ChildItems": [
              {
                "Key": "input[data-tipid=gradetxt-1]",
                "Title": "主题",
                "Logic": 0,
                "Items": [{
                  "Key": "input[data-tipid=gradetxt-1]",
                  "Title": "主题",
                  "Logic": 0,
                  "Field": "SU",
                  "Operator": "TOPRANK",
                  "Value": title,
                  "Value2": ""
                }],
                "ChildItems": []
              },
              {
                "Key": "input[data-tipid=gradetxt-2]",
                "Title": "作者",
                "Logic": 0,
                "Items": [{
                  "Key": "input[data-tipid=gradetxt-2]",
                  "Title": "作者",
                  "Logic": 0,
                  "Field": "AU",
                  "Operator": "DEFAULT",
                  "Value": author,
                  "Value2": ""
                }],
                "ChildItems": []
              }
            ]
          },
          {
            "Key": "ControlGroup",
            "Title": "",
            "Logic": 0,
            "Items": [],
            "ChildItems": []
          }
        ]
      },
      "ExScope": "1",
      "SearchType": 1,
      "Rlang": "CHINESE",
      "KuaKuCode": "YSTT4HG0,LSTPFY1C,JUP3MUPD,MPMFIG1A,EMRPGLPA,WQ0UVIAA,BLZOG7CK,PWFIRAGL,NN3FJMUV,NLBO1Z6R",
      "Expands": {},
      "SearchFrom": 1
    }),
    pageNum: 1,
    pageSize: 1,
    sortField: '',
    sortType: '',
    dstyle: '',
    listmode: '',
    productStr: 'YSTT4HG0,LSTPFY1C,RMJLXHZ3,JQIRZIYA,JUP3MUPD,1UR4K4HZ,BPBAFJ5S,R79MZMCB,MPMFIG1A,EMRPGLPA,J708GVCE,ML4DRIDX,WQ0UVIAA,NB3BWEHK,XVLO76FD,HR1YT1Z9,BLZOG7CK,PWFIRAGL,NN3FJMUV,NLBO1Z6R,',
    aside: `（主题：${title}）AND（作者：${author}(精确)）`,
    searchFrom: '资源范围：总库;  中英文扩展;  时间范围：更新时间：不限; ',
    subject: '',
    language: '',
    uniplatform: '',
    CurPage: 1
  };

  const options: HttpsRequestOptions = {
    hostname: CNKI_BASE_URL,
    path: SEARCH_PATH,
    method: 'POST',
    headers: {
      "accept": "*/*",
      "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      "cookie": `Ecp_ClientId=${ecpClientId}`,
      "Referer": REFERER_SEARCH
    }
  };

  const postData = jsontoformdata(searchData);
  const response = await httpsRequest(options, postData);
  
  // 如果请求失败，清除缓存的ClientId
  if (response.statusCode !== 200) {
    cache.delete(CACHE_KEY_ECP_CLIENT_ID);
    return null;
  }
  
  const searchResults = parseSearchResults(response.data);
  
  // 如果找到文章且作者匹配，获取导出数据
  if (searchResults.articles.length > 0) {
    const firstArticle = searchResults.articles[0];
    if (checkAuthor(author, firstArticle.author)) {
      return await search(firstArticle.CookieName, ecpClientId);
    }
  }
  
  return null;
}

/**
 * 获取参考文献
 * @param txt 输入文本
 * @returns 参考文献字符串
 */
export async function getReference(txt: string): Promise<string> {
  const basicInfo = extractTitleAndAuthor(txt);
  let article = null;
  let reference = '';

  if (basicInfo) {
    // 先检查缓存
    if (cache.has(basicInfo.uuid)) {
      console.log('缓存命中:', basicInfo.uuid);
      article = cache.get(basicInfo.uuid);
    } else {
      // 搜索文章并缓存结果
      article = await requestCNKI(basicInfo.title, getFirstSegment(basicInfo.author));

      // 缓存搜索结果
      if (article) {
        cache.set(basicInfo.uuid, article);
      }
    }
  }

  // 找到文章，使用CNKI数据生成引用
  if (basicInfo && article) {
    console.log('获取到文章数据:', article);
    
    if (article.code === 1 && article.data && article.data.length > 0) {
      article.data.forEach((item: ArticleItem) => {
        if (item.mode === GBT_REFER_MODE && item.value && item.value.length > 0) {
          // 清理HTML标签并分割DOI
          const refs = item.value[0].replace(/<br>/g, '').split('DOI');
          reference = `\n\n\n\n> 规范引文：${refs[0]}`;
        }
      });
    }
  }

  return reference;
}

