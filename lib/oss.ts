import OSS from 'ali-oss';

/**
 * OSS 客户端配置接口
 */
export interface OSSConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  bucket: string;
}

/**
 * 上传文件参数
 */
export interface UploadFileParams {
  bucket: string;
  key: string;
  body: Buffer | string | ReadableStream;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * 下载文件参数
 */
export interface DownloadFileParams {
  bucket: string;
  key: string;
  range?: string;
  timeout?: number;
}

/**
 * 删除文件参数
 */
export interface DeleteFileParams {
  bucket: string;
  key: string;
}

/**
 * 列举文件参数
 */
export interface ListObjectsParams {
  bucket: string;
  prefix?: string;
  maxKeys?: number;
  marker?: string;
}

/**
 * 文件信息
 */
export interface ObjectInfo {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass?: string;
}

/**
 * 创建存储桶参数
 */
export interface CreateBucketParams {
  bucket: string;
  region?: string;
}

/**
 * OSS 操作错误类型
 */
export class OSSOperationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'OSSOperationError';
  }
}

/**
 * 全局 OSS 客户端实例
 */
let _ossClient: OSS | null = null;

/**
 * 获取 OSS 配置
 * 从环境变量中读取配置
 */
function getOSSConfig(): OSSConfig {
  const accessKeyId = process.env.OSS_ACCESS_KEY;
  const accessKeySecret = process.env.OSS_SECRET_KEY;
  const region = process.env.OSS_REGION;
  const bucket = process.env.OSS_BUCKET;

  if (!accessKeyId) {
    throw new Error('Missing OSS_ACCESS_KEY environment variable');
  }
  if (!accessKeySecret) {
    throw new Error('Missing OSS_SECRET_KEY environment variable');
  }
  if (!region) {
    throw new Error('Missing OSS_REGION environment variable');
  }
  if (!bucket) {
    throw new Error('Missing OSS_BUCKET environment variable');
  }

  return {
    accessKeyId,
    accessKeySecret,
    region,
    bucket,
  };
}

/**
 * 获取 OSS 客户端实例（单例模式）
 * 延迟初始化，避免在构建时就需要配置
 */
export function getOSSClient(): OSS {
  if (!_ossClient) {
    const config = getOSSConfig();
    _ossClient = new OSS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      region: config.region,
      bucket: config.bucket,
    });
  }
  return _ossClient;
}

/**
 * 处理 OSS 错误
 * 将 OSS 错误转换为统一的错误格式
 */
function handleOSSError(error: unknown): never {
  if (error instanceof Error) {
    throw new OSSOperationError(
      `OSS 错误: ${error.message}`,
      error
    );
  } else {
    throw new OSSOperationError(
      `未知错误类型: ${String(error)}`,
      error as Error
    );
  }
}

/**
 * 上传文件到 OSS
 * @param params 上传参数
 * @returns 上传成功的文件信息
 */
export async function uploadFile(params: UploadFileParams): Promise<{ key: string; etag: string }> {
  try {
    const client = getOSSClient();

    // 转换 body 类型以匹配 ali-oss 要求
    let body: Buffer | NodeJS.ReadableStream;
    if (typeof params.body === 'string') {
      body = Buffer.from(params.body);
    } else if (params.body instanceof Buffer) {
      body = params.body;
    } else if (params.body instanceof ReadableStream) {
      const { Readable } = await import('stream');
      body = Readable.fromWeb(params.body as any);
    } else {
      body = params.body as Buffer | NodeJS.ReadableStream;
    }

    const headers: Record<string, string> = {};
    if (params.contentType) {
      headers['Content-Type'] = params.contentType;
    }
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        headers[`x-oss-meta-${key}`] = value;
      }
    }

    const result = await client.put(params.key, body, { headers });

    return {
      key: params.key,
      etag: (result as any).etag || '',
    };
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 从 OSS 下载文件
 * @param params 下载参数
 * @returns 文件内容和元数据
 */
export async function downloadFile(params: DownloadFileParams): Promise<{ content: Buffer; metadata: Record<string, string> }> {
  try {
    const client = getOSSClient();

    const options: Record<string, any> = {};
    if (params.range) {
      options.headers = { Range: params.range };
    }
    options.timeout = 60000*2;
    if (params.timeout) {
      options.timeout = params.timeout;
    }
    const result = await client.get(params.key, options);

    // 确保返回的是 Buffer 类型
    let content: Buffer;
    if (Buffer.isBuffer(result.content)) {
      content = result.content;
    } else {
      content = Buffer.from(result.content as any);
    }

    return {
      content,
      metadata: result.res?.headers as Record<string, string> || {},
    };
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 从 OSS 删除文件
 * @param params 删除参数
 * @returns 删除是否成功
 */
export async function deleteFile(params: DeleteFileParams): Promise<boolean> {
  try {
    const client = getOSSClient();

    await client.delete(params.key);

    return true;
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 批量删除文件
 * @param bucket 存储桶名称
 * @param keys 文件键数组
 * @returns 删除结果
 */
export async function deleteFiles(bucket: string, keys: string[]): Promise<{ deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];

  for (const key of keys) {
    try {
      await deleteFile({ bucket, key });
      deleted.push(key);
    } catch (error) {
      errors.push(key);
    }
  }

  return { deleted, errors };
}

/**
 * 列举存储桶中的文件
 * @param params 列举参数
 * @returns 文件列表
 */
export async function listObjects(params: ListObjectsParams): Promise<ObjectInfo[]> {
  try {
    const client = getOSSClient();

    const options: Record<string, any> = {};
    if (params.prefix) {
      options.prefix = params.prefix;
    }
    if (params.maxKeys) {
      options['max-keys'] = params.maxKeys;
    }
    if (params.marker) {
      options.marker = params.marker;
    }

    const result = await client.list(options);

    return (result.objects || []).map((item: any) => ({
      key: item.name,
      size: item.size,
      lastModified: new Date(item.lastModified),
      etag: item.etag || '',
      storageClass: item.storageClass || undefined,
    }));
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 获取文件元数据
 * @param bucket 存储桶名称
 * @param key 文件键
 * @returns 文件元数据
 */
export async function headObject(bucket: string, key: string): Promise<Record<string, string>> {
  try {
    const client = getOSSClient();

    const result = await client.head(key);

    return result.res?.headers as Record<string, string> || {};
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 创建存储桶
 * @param params 创建参数
 * @returns 是否创建成功
 */
export async function createBucket(params: CreateBucketParams): Promise<boolean> {
  try {
    const client = getOSSClient();

    const options: Record<string, any> = {};
    if (params.region) {
      options.location = params.region;
    }

    await client.putBucket(params.bucket, options);

    return true;
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 检查存储桶是否存在
 * @param bucket 存储桶名称
 * @returns 是否存在
 */
export async function bucketExists(bucket: string): Promise<boolean> {
  try {
    const client = getOSSClient();

    await client.getBucketInfo(bucket);
    return true;
  } catch (error) {
    if (error instanceof Error && (error as any).code === 'NoSuchBucket') {
      return false;
    }
    handleOSSError(error);
  }
}

/**
 * 列举所有存储桶
 * @returns 存储桶列表
 */
export async function listBuckets(): Promise<Array<{ name: string; region: string; creationDate: Date }>> {
  try {
    const client = getOSSClient();

    const result = await client.listBuckets();

    return (result.buckets || []).map((bucket: any) => ({
      name: bucket.name,
      region: bucket.region || '',
      creationDate: new Date(bucket.creationDate),
    }));
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 生成预签名 URL 参数
 */
export interface PresignedUrlParams {
  bucket: string;
  key: string;
  /** 过期时间，单位秒，默认 3600 秒（1 小时） */
  expiresIn?: number;
  /** HTTP 方法，ali-oss 支持 GET / PUT */
  method?: 'GET' | 'PUT';
}

/**
 * 生成预签名 URL
 * 用于临时访问 OSS 中的文件
 * @param params 预签名 URL 参数
 * @returns 预签名 URL
 */
export async function generatePresignedUrl(params: PresignedUrlParams): Promise<string> {
  try {
    const client = getOSSClient();

    const { key, expiresIn = 3600, method = 'GET' } = params;

    return client.signatureUrl(key, {
      expires: expiresIn,
      method,
    });
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 复制文件
 * @param sourceBucket 源存储桶
 * @param sourceKey 源文件键
 * @param targetBucket 目标存储桶
 * @param targetKey 目标文件键
 * @returns 是否复制成功
 */
export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  targetBucket: string,
  targetKey: string
): Promise<boolean> {
  try {
    const client = getOSSClient();

    await client.copy(targetKey, `/${sourceBucket}/${sourceKey}`);

    return true;
  } catch (error) {
    handleOSSError(error);
  }
}

/**
 * 获取文件的临时访问 URL（预签名 URL）
 * @param bucket 存储桶名称
 * @param key 文件键
 * @param expires 过期时间（秒），默认 3600 秒（1小时）
 * @returns 预签名 URL
 */
export async function getPresignedUrl(bucket: string, key: string, expires: number = 3600): Promise<string> {
  try {
    const client = getOSSClient();

    const url = client.signatureUrl(key, {
      expires,
    });

    return url;
  } catch (error) {
    handleOSSError(error);
  }
}
