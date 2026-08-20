import {
  uploadFile,
  downloadFile,
  deleteFile,
  deleteFiles,
  listObjects,
  headObject,
  createBucket,
  bucketExists,
  listBuckets,
  copyObject,
  getPresignedUrl,
} from '../lib/tos';

/**
 * TOS 使用示例
 * 
 * 使用前请确保已配置以下环境变量：
 * - TOS_ACCESS_KEY: TOS 访问密钥
 * - TOS_SECRET_KEY: TOS 密钥
 * - TOS_REGION: 区域，如 cn-beijing
 * - TOS_ENDPOINT: 端点，如 tos-cn-beijing.volces.com
 */

const BUCKET_NAME = 'your-bucket-name';

// 示例1: 上传文件
async function uploadExample() {
  try {
    const fileContent = 'Hello, TOS!';
    const result = await uploadFile({
      bucket: BUCKET_NAME,
      key: 'test/example.txt',
      body: Buffer.from(fileContent),
      contentType: 'text/plain',
      metadata: {
        'custom-key': 'custom-value',
      },
    });
    console.log('上传成功:', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
}

// 示例2: 下载文件
async function downloadExample() {
  try {
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: 'test/example.txt',
    });
    console.log('下载成功，文件内容:', result.content.toString());
    console.log('文件元数据:', result.metadata);
  } catch (error) {
    console.error('下载失败:', error);
  }
}

// 示例3: 删除文件
async function deleteExample() {
  try {
    const success = await deleteFile({
      bucket: BUCKET_NAME,
      key: 'test/example.txt',
    });
    console.log('删除成功:', success);
  } catch (error) {
    console.error('删除失败:', error);
  }
}

// 示例4: 批量删除文件
async function batchDeleteExample() {
  try {
    const result = await deleteFiles(BUCKET_NAME, [
      'test/file1.txt',
      'test/file2.txt',
      'test/file3.txt',
    ]);
    console.log('批量删除结果:', result);
    console.log('成功删除:', result.deleted);
    console.log('删除失败:', result.errors);
  } catch (error) {
    console.error('批量删除失败:', error);
  }
}

// 示例5: 列举文件
async function listObjectsExample() {
  try {
    const objects = await listObjects({
      bucket: BUCKET_NAME,
      prefix: 'test/',
      maxKeys: 100,
    });
    console.log('文件列表:', objects);
    objects.forEach(obj => {
      console.log(`- ${obj.key} (${obj.size} bytes)`);
    });
  } catch (error) {
    console.error('列举文件失败:', error);
  }
}

// 示例6: 获取文件元数据
async function headObjectExample() {
  try {
    const metadata = await headObject(BUCKET_NAME, 'test/example.txt');
    console.log('文件元数据:', metadata);
  } catch (error) {
    console.error('获取元数据失败:', error);
  }
}

// 示例7: 创建存储桶
async function createBucketExample() {
  try {
    const success = await createBucket({
      bucket: BUCKET_NAME,
      region: 'cn-beijing',
    });
    console.log('创建存储桶成功:', success);
  } catch (error) {
    console.error('创建存储桶失败:', error);
  }
}

// 示例8: 检查存储桶是否存在
async function bucketExistsExample() {
  try {
    const exists = await bucketExists(BUCKET_NAME);
    console.log(`存储桶 ${BUCKET_NAME} ${exists ? '存在' : '不存在'}`);
  } catch (error) {
    console.error('检查存储桶失败:', error);
  }
}

// 示例9: 列举所有存储桶
async function listBucketsExample() {
  try {
    const buckets = await listBuckets();
    console.log('存储桶列表:', buckets);
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name} (${bucket.region})`);
    });
  } catch (error) {
    console.error('列举存储桶失败:', error);
  }
}

// 示例10: 复制文件
async function copyObjectExample() {
  try {
    const success = await copyObject(
      BUCKET_NAME,
      'test/source.txt',
      BUCKET_NAME,
      'test/destination.txt'
    );
    console.log('复制文件成功:', success);
  } catch (error) {
    console.error('复制文件失败:', error);
  }
}

// 示例11: 获取预签名 URL
async function getPresignedUrlExample() {
  try {
    const url = await getPresignedUrl(BUCKET_NAME, 'test/example.txt', 3600);
    console.log('预签名 URL:', url);
    // 可以使用这个 URL 直接访问文件，有效期 1 小时
  } catch (error) {
    console.error('获取预签名 URL 失败:', error);
  }
}

// 完整示例: 上传文件并获取访问链接
async function uploadAndGetUrlExample() {
  try {
    // 1. 上传文件
    const fileContent = 'Hello, TOS!';
    const uploadResult = await uploadFile({
      bucket: BUCKET_NAME,
      key: 'documents/important.txt',
      body: Buffer.from(fileContent),
      contentType: 'text/plain',
    });
    console.log('上传成功:', uploadResult);

    // 2. 获取预签名 URL（1小时有效期）
    const url = await getPresignedUrl(BUCKET_NAME, uploadResult.key, 3600);
    console.log('文件访问链接:', url);

    // 3. 获取文件元数据
    const metadata = await headObject(BUCKET_NAME, uploadResult.key);
    console.log('文件元数据:', metadata);

    return url;
  } catch (error) {
    console.error('操作失败:', error);
    throw error;
  }
}

// 运行示例
async function runExamples() {
  console.log('开始运行 TOS 示例...\n');

  // 取消注释要运行的示例
  // await uploadExample();
  // await downloadExample();
  // await deleteExample();
  // await batchDeleteExample();
  // await listObjectsExample();
  // await headObjectExample();
  // await createBucketExample();
  // await bucketExistsExample();
  // await listBucketsExample();
  // await copyObjectExample();
  // await getPresignedUrlExample();
  // await uploadAndGetUrlExample();

  console.log('\n示例运行完成');
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  uploadExample,
  downloadExample,
  deleteExample,
  batchDeleteExample,
  listObjectsExample,
  headObjectExample,
  createBucketExample,
  bucketExistsExample,
  listBucketsExample,
  copyObjectExample,
  getPresignedUrlExample,
  uploadAndGetUrlExample,
};
