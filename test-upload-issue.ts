import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ocrPdf } from './lib/volcano-visual';

/**
 * 测试火山视觉 API 上传问题
 * 
 * 问题分析：
 * 1. 错误信息：Error when parsing request
 * 2. 状态码：400 Bad Request
 * 
 * 可能原因：
 * 1. Base64 编码后的数据过大（API 限制：Base64 编码和 urlencode 之后不超过 8MB）
 * 2. 请求格式问题
 * 3. URL 编码问题
 */

// 测试用的 PDF 文件路径（请替换为实际的 PDF 文件路径）
const TEST_PDF_PATH = '/path/to/test.pdf';

async function testFileSize() {
  console.log('========== 测试文件大小 ==========\n');

  try {
    // 检查文件是否存在
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.error(`错误：文件不存在 - ${TEST_PDF_PATH}`);
      return;
    }

    // 读取文件
    const buffer = fs.readFileSync(TEST_PDF_PATH);
    const fileSizeMB = buffer.length / (1024 * 1024);
    console.log(`原始文件大小: ${fileSizeMB.toFixed(2)} MB`);

    // 转换为 Base64
    const base64 = buffer.toString('base64');
    const base64SizeMB = base64.length / (1024 * 1024);
    console.log(`Base64 编码后大小: ${base64SizeMB.toFixed(2)} MB`);

    // URL 编码后的大小
    const urlEncoded = encodeURIComponent(base64);
    const urlEncodedSizeMB = urlEncoded.length / (1024 * 1024);
    console.log(`URL 编码后大小: ${urlEncodedSizeMB.toFixed(2)} MB`);

    // 检查是否超过 API 限制
    const API_LIMIT_MB = 8;
    if (urlEncodedSizeMB > API_LIMIT_MB) {
      console.error(`\n⚠️  警告：URL 编码后大小 (${urlEncodedSizeMB.toFixed(2)} MB) 超过 API 限制 (${API_LIMIT_MB} MB)`);
      console.error('建议：');
      console.error('  1. 使用 image_url 替代 image_base64');
      console.error('  2. 先上传文件到 TOS，然后使用 URL 方式调用 API');
    } else {
      console.log(`\n✅ 文件大小符合要求 (小于 ${API_LIMIT_MB} MB)`);
    }

  } catch (error) {
    console.error('测试文件大小失败:', error);
  }
}

async function testApiCall() {
  console.log('\n========== 测试 API 调用 ==========\n');

  try {
    if (!fs.existsSync(TEST_PDF_PATH)) {
      console.error(`错误：文件不存在 - ${TEST_PDF_PATH}`);
      return;
    }

    const buffer = fs.readFileSync(TEST_PDF_PATH);
    const base64 = buffer.toString('base64');

    console.log('开始调用 OCRPdf API（使用 image_base64）...');
    
    const result = await ocrPdf({
      image_base64: base64,
      file_type: 'pdf',
      page_num: 300,
      parse_mode: 'auto',
      table_mode: 'markdown',
    });

    console.log('✅ API 调用成功！');
    console.log(`Markdown 长度: ${result.markdown.length} 字符`);
    console.log(`结构化信息条数: ${result.detail.length}`);

  } catch (error) {
    console.error('❌ API 调用失败:');
    if (error instanceof Error) {
      console.error(`错误信息: ${error.message}`);
    } else {
      console.error(error);
    }
  }
}

async function main() {
  console.log('开始测试火山视觉 API 上传问题...\n');
  
  await testFileSize();
  await testApiCall();
  
  console.log('\n========== 测试完成 ==========');
}

main().catch(console.error);
