// test/oss.js
// 测试 lib/oss.ts 中的所有导出方法
// 用法: npx tsx test/oss.js

import 'dotenv/config';
import {
  getOSSClient,
  uploadFile,
  downloadFile,
  deleteFile,
  deleteFiles,
  listObjects,
  headObject,
  createBucket,
  bucketExists,
  listBuckets,
  generatePresignedUrl,
  copyObject,
  getPresignedUrl,
} from '../lib/oss.js';

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============ 配置 ============
const TEST_BUCKET = process.env.OSS_BUCKET || 'soulmate-music';
const TEST_KEY_PREFIX = 'test/oss-test';
const TEST_PHOTO_PATH = join(__dirname, 'local', 'photo.png');

// ============ 工具函数 ============
function section(title) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(50));
}

// ============ 测试函数 ============

/** 测试 1: getOSSClient - 获取客户端单例 */
async function testGetOSSClient() {
  section('1. getOSSClient - 获取客户端单例');
  const client = getOSSClient();
  console.log('客户端实例:', client ? 'OK' : 'FAIL');
  // 再次调用，确认是同一个实例
  const client2 = getOSSClient();
  console.log('单例验证:', client === client2 ? 'PASS (同一实例)' : 'FAIL (不同实例)');
  return client;
}

/** 测试 2: uploadFile - 上传文件 */
async function testUploadFile() {
  section('2. uploadFile - 上传文件');
  const body = readFileSync(TEST_PHOTO_PATH);
  const key = `${TEST_KEY_PREFIX}/photo.png`;

  const result = await uploadFile({
    bucket: TEST_BUCKET,
    key,
    body,
    contentType: 'image/png',
    metadata: { test: 'oss-upload-test' },
  });

  console.log('上传结果:', result);
  console.log('key:', result.key);
  console.log('etag:', result.etag);
  return key;
}

/** 测试 3: uploadFile - 上传字符串 */
async function testUploadString() {
  section('3. uploadFile - 上传字符串内容');
  const key = `${TEST_KEY_PREFIX}/hello.txt`;

  const result = await uploadFile({
    bucket: TEST_BUCKET,
    key,
    body: 'Hello, Ali OSS!',
    contentType: 'text/plain',
  });

  console.log('上传结果:', result);
  return key;
}

/** 测试 4: headObject - 获取文件元数据 */
async function testHeadObject(key) {
  section('4. headObject - 获取文件元数据');
  const metadata = await headObject(TEST_BUCKET, key);
  console.log('元数据 keys:', Object.keys(metadata));
  console.log('content-type:', metadata['content-type']);
  return metadata;
}

/** 测试 5: downloadFile - 下载文件 */
async function testDownloadFile(key) {
  section('5. downloadFile - 下载文件');
  const result = await downloadFile({
    bucket: TEST_BUCKET,
    key,
  });
  console.log('内容长度:', result.content.length, 'bytes');
  console.log('metadata keys:', Object.keys(result.metadata));
  return result;
}

/** 测试 6: downloadFile - 带 range 下载 */
async function testDownloadFileRange(key) {
  section('6. downloadFile - 带 range 下载前 100 bytes');
  const result = await downloadFile({
    bucket: TEST_BUCKET,
    key,
    range: 'bytes=0-99',
  });
  console.log('部分内容长度:', result.content.length, 'bytes');
  return result;
}

/** 测试 7: generatePresignedUrl - 生成预签名 URL */
async function testGeneratePresignedUrl(key) {
  section('7. generatePresignedUrl - 生成预签名 URL');
  const url = await generatePresignedUrl({
    bucket: TEST_BUCKET,
    key,
    expiresIn: 600,
    method: 'GET',
  });
  console.log('预签名 URL:', url.substring(0, 120) + '...');
  return url;
}

/** 测试 8: getPresignedUrl - 获取临时访问 URL */
async function testGetPresignedUrl(key) {
  section('8. getPresignedUrl - 获取临时访问 URL');
  const url = await getPresignedUrl(TEST_BUCKET, key, 600);
  console.log('临时 URL:', url.substring(0, 120) + '...');
  return url;
}

/** 测试 9: listObjects - 列举文件 */
async function testListObjects() {
  section('9. listObjects - 列举 test/ 前缀下的文件');
  const objects = await listObjects({
    bucket: TEST_BUCKET,
    prefix: 'test/',
    maxKeys: 20,
  });
  console.log('文件数量:', objects.length);
  objects.forEach((obj) => {
    console.log(`  - ${obj.key} (${obj.size} bytes, ${obj.etag})`);
  });
  return objects;
}

/** 测试 10: listBuckets - 列举所有存储桶 */
async function testListBuckets() {
  section('10. listBuckets - 列举所有存储桶');
  const buckets = await listBuckets();
  console.log('存储桶数量:', buckets.length);
  buckets.forEach((b) => {
    console.log(`  - ${b.name} (region: ${b.region}, created: ${b.creationDate.toISOString()})`);
  });
  return buckets;
}

/** 测试 11: bucketExists - 检查存储桶是否存在 */
async function testBucketExists() {
  section('11. bucketExists - 检查存储桶是否存在');
  const exists = await bucketExists(TEST_BUCKET);
  console.log(`存储桶 "${TEST_BUCKET}" 存在:`, exists);

  const notExists = await bucketExists('this-bucket-definitely-not-exist-12345');
  console.log('不存在的存储桶:', notExists);
}

/** 测试 12: copyObject - 复制文件 */
async function testCopyObject(key) {
  section('12. copyObject - 复制文件');
  const targetKey = `${TEST_KEY_PREFIX}/photo-copy.png`;

  const result = await copyObject(
    TEST_BUCKET,
    key,
    TEST_BUCKET,
    targetKey
  );
  console.log('复制成功:', result);
  return targetKey;
}

/** 测试 13: deleteFiles - 批量删除文件 */
async function testDeleteFiles(keys) {
  section('13. deleteFiles - 批量删除文件');
  const result = await deleteFiles(TEST_BUCKET, keys);
  console.log('已删除:', result.deleted);
  console.log('失败:', result.errors);
  return result;
}

/** 测试 14: deleteFile - 删除单个文件 */
async function testDeleteFile(key) {
  section('14. deleteFile - 删除单个文件');
  const result = await deleteFile({ bucket: TEST_BUCKET, key });
  console.log('删除成功:', result);
  return result;
}

/** 测试 15: createBucket（注意：这会创建真实存储桶，谨慎调用） */
async function testCreateBucket() {
  section('15. createBucket - 创建存储桶（跳过，避免真实创建）');
  console.log('跳过 - 如需测试请取消注释以下代码');
  // const result = await createBucket({ bucket: 'test-bucket-name', region: 'oss-cn-shanghai' });
  // console.log('创建结果:', result);
}

// ============ 主测试流程 ============
async function main() {
  console.log('OSS 测试开始...\n');
  console.log('使用存储桶:', TEST_BUCKET);
  console.log('测试图片:', TEST_PHOTO_PATH);

  const uploadedKeys = [];

  try {
    // 1. 获取客户端
    await testGetOSSClient();

    // 2. 上传图片文件
    const photoKey = await testUploadFile();
    uploadedKeys.push(photoKey);

    // 3. 上传字符串文件
    const textKey = await testUploadString();
    uploadedKeys.push(textKey);

    // 4. 获取元数据
    await testHeadObject(photoKey);

    // 5. 下载文件
    await testDownloadFile(textKey);

    // 6. 带 range 下载
    await testDownloadFileRange(photoKey);

    // 7. 生成预签名 URL
    await testGeneratePresignedUrl(photoKey);

    // 8. 获取临时 URL
    await testGetPresignedUrl(photoKey);

    // 9. 列举文件
    await testListObjects();

    // 10. 列举存储桶
    await testListBuckets();

    // 11. 检查存储桶是否存在
    await testBucketExists();

    // 12. 复制文件
    const copyKey = await testCopyObject(photoKey);
    uploadedKeys.push(copyKey);

    // 13. 批量删除
    await testDeleteFiles(uploadedKeys);

    // 确认删除后 list 为空
    section('确认：批量删除后列举 test/ 前缀');
    const remaining = await listObjects({ bucket: TEST_BUCKET, prefix: 'test/' });
    console.log('剩余文件数量:', remaining.length);

    console.log('\n✅ 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    // 清理已上传的文件
    if (uploadedKeys.length > 0) {
      console.log('\n清理已上传的测试文件...');
      await deleteFiles(TEST_BUCKET, uploadedKeys).catch(() => {});
    }
    process.exit(1);
  }
}

main();
