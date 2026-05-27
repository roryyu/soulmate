import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';

/**
 * TOS 客户端配置接口
 */
export interface TOSConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint: string;
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
 * TOS 操作错误类型
 */
export class TOSOperationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: TosClientError | TosServerError | Error
  ) {
    super(message);
    this.name = 'TOSOperationError';
  }
}

/**
 * 全局 TOS 客户端实例
 */
let _tosClient: TosClient | null = null;

/**
 * 获取 TOS 配置
 * 从环境变量中读取配置
 */
function getTOSConfig(): TOSConfig {
  const accessKeyId = process.env.TOS_ACCESS_KEY;
  const accessKeySecret = process.env.TOS_SECRET_KEY;
  const region = process.env.TOS_REGION;
  const endpoint = process.env.TOS_ENDPOINT;

  if (!accessKeyId) {
    throw new Error('Missing TOS_ACCESS_KEY environment variable');
  }
  if (!accessKeySecret) {
    throw new Error('Missing TOS_SECRET_KEY environment variable');
  }
  if (!region) {
    throw new Error('Missing TOS_REGION environment variable');
  }
  if (!endpoint) {
    throw new Error('Missing TOS_ENDPOINT environment variable');
  }

  return {
    accessKeyId,
    accessKeySecret,
    region,
    endpoint,
  };
}

/**
 * 获取 TOS 客户端实例（单例模式）
 * 延迟初始化，避免在构建时就需要配置
 */
export function getTOSClient(): TosClient {
  if (!_tosClient) {
    const config = getTOSConfig();
    _tosClient = new TosClient({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      region: config.region,
      endpoint: config.endpoint,
    });
  }
  return _tosClient;
}

/**
 * 处理 TOS 错误
 * 将 TOS 错误转换为统一的错误格式
 */
function handleTOSError(error: unknown): never {
  if (error instanceof TosClientError) {
    throw new TOSOperationError(
      `TOS 客户端错误: ${error.message}`,
      error
    );
  } else if (error instanceof TosServerError) {
    throw new TOSOperationError(
      `TOS 服务错误: ${error.code} - ${error.message}`,
      error
    );
  } else if (error instanceof Error) {
    throw new TOSOperationError(
      `未知错误: ${error.message}`,
      error
    );
  } else {
    throw new TOSOperationError(
      `未知错误类型: ${String(error)}`,
      error as Error
    );
  }
}

/**
 * 上传文件到 TOS
 * @param params 上传参数
 * @returns 上传成功的文件信息
 */
export async function uploadFile(params: UploadFileParams): Promise<{ key: string; etag: string }> {
  try {
    const client = getTOSClient();
    
    // 转换 body 类型以匹配 TOS SDK 要求
    let body: Buffer | NodeJS.ReadableStream;
    if (typeof params.body === 'string') {
      body = Buffer.from(params.body);
    } else if (params.body instanceof Buffer) {
      body = params.body;
    } else if (params.body instanceof ReadableStream) {
      // 将 Web ReadableStream 转换为 Node.js ReadableStream
      const { Readable } = await import('stream');
      body = Readable.fromWeb(params.body as any);
    } else {
      body = params.body as Buffer | NodeJS.ReadableStream;
    }
    
    const result = await client.putObject({
      bucket: params.bucket,
      key: params.key,
      body,
      contentType: params.contentType,
      meta: params.metadata,
    });

    return {
      key: params.key,
      etag: result.headers['etag'] || '',
    };
  } catch (error) {
    handleTOSError(error);
  }
}

/**
 * 从 TOS 下载文件
 * @param params 下载参数
 * @returns 文件内容和元数据
 */
export async function downloadFile(params: DownloadFileParams): Promise<{ content: Buffer; metadata: Record<string, string> }> {
  try {
    const client = getTOSClient();
    
    // 使用 getObjectV2 并指定 dataType 为 'buffer' 以直接获取 Buffer
    const getObjectParams: any = {
      bucket: params.bucket,
      key: params.key,
      dataType: 'buffer',
    };
    
    // 如果指定了 range，添加到参数中
    if (params.range) {
      getObjectParams.range = params.range;
    }
    
    const result = await client.getObjectV2(getObjectParams);

    // 确保返回的是 Buffer 类型
    let content: Buffer;
    if (Buffer.isBuffer(result.data.content)) {
      content = result.data.content;
    } else {
      // 如果不是 Buffer，尝试转换
      content = Buffer.from(result.data.content as any);
    }

    return {
      content,
      metadata: result.headers as Record<string, string>,
    };
  } catch (error) {
    handleTOSError(error);
  }
}

/**
 * 从 TOS 删除文件
 * @param params 删除参数
 * @returns 删除是否成功
 */
export async function deleteFile(params: DeleteFileParams): Promise<boolean> {
  try {
    const client = getTOSClient();
    
    await client.deleteObject({
      bucket: params.bucket,
      key: params.key,
    });

    return true;
  } catch (error) {
    handleTOSError(error);
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
    const client = getTOSClient();
    
    const result = await client.listObjects({
      bucket: params.bucket,
      prefix: params.prefix,
      maxKeys: params.maxKeys,
      marker: params.marker,
    });

    return (result.data.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: new Date(item.LastModified),
      etag: item.ETag,
      storageClass: item.StorageClass,
    }));
  } catch (error) {
    handleTOSError(error);
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
    const client = getTOSClient();
    
    const result = await client.headObject({
      bucket,
      key,
    });

    return result.headers as Record<string, string>;
  } catch (error) {
    handleTOSError(error);
  }
}

/**
 * 创建存储桶
 * @param params 创建参数
 * @returns 是否创建成功
 */
export async function createBucket(params: CreateBucketParams): Promise<boolean> {
  try {
    const client = getTOSClient();
    
    const createBucketParams: any = {
      bucket: params.bucket,
    };
    
    // 如果指定了 region，添加到参数中
    if (params.region) {
      createBucketParams.region = params.region;
    }
    
    await client.createBucket(createBucketParams);

    return true;
  } catch (error) {
    handleTOSError(error);
  }
}

/**
 * 检查存储桶是否存在
 * @param bucket 存储桶名称
 * @returns 是否存在
 */
export async function bucketExists(bucket: string): Promise<boolean> {
  try {
    const client = getTOSClient();
    
    await client.headBucket(bucket);
    return true;
  } catch (error) {
    if (error instanceof TosServerError && error.statusCode === 404) {
      return false;
    }
    handleTOSError(error);
  }
}

/**
 * 列举所有存储桶
 * @returns 存储桶列表
 */
export async function listBuckets(): Promise<Array<{ name: string; region: string; creationDate: Date }>> {
  try {
    const client = getTOSClient();
    
    const result = await client.listBuckets();

    return (result.data.Buckets || []).map(bucket => ({
      name: bucket.Name,
      region: bucket.Location || '',
      creationDate: new Date(bucket.CreationDate),
    }));
  } catch (error) {
    handleTOSError(error);
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
  /** HTTP 方法，TOS SDK 仅支持 GET / PUT */
  method?: 'GET' | 'PUT';
}

/**
 * 生成预签名 URL
 * 用于临时访问 TOS 中的文件
 * @param params 预签名 URL 参数
 * @returns 预签名 URL
 */
export async function generatePresignedUrl(params: PresignedUrlParams): Promise<string> {
  try {
    const client = getTOSClient();
    
    const { bucket, key, expiresIn = 3600, method = 'GET' } = params;
    
    // 注意：TOS SDK 正确方法名为 getPreSignedUrl，参数名为 expires
    return client.getPreSignedUrl({
      bucket,
      key,
      expires: expiresIn,
      method,
    });
  } catch (error) {
    handleTOSError(error);
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
    const client = getTOSClient();
    
    await client.copyObject({
      bucket: targetBucket,
      key: targetKey,
      srcBucket: sourceBucket,
      srcKey: sourceKey,
    });

    return true;
  } catch (error) {
    handleTOSError(error);
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
    const client = getTOSClient();
    
    const url = await client.getPreSignedUrl({
      method: 'GET',
      bucket,
      key,
      expires,
    });

    return url;
  } catch (error) {
    handleTOSError(error);
  }
}
