import 'dotenv/config';
import { ocrPdf } from '../lib/volcano-visual';

/**
 * 火山引擎视觉 API 测试脚本
 *
 * 使用前请确保已配置以下环境变量：
 * - VISUAL_ACCESS_KEY_ID: 视觉 API 访问密钥 ID
 * - VISUAL_ACCESS_KEY_SECRET: 视觉 API 密钥
 * - VISUAL_REGION: 区域，默认为 cn-north-1
 */

const TEST_PDF_URL = 'https://edu-nexus.tos-cn-shanghai.volces.com/research/documents/cmmtcf1rp0001igj0iiuz5hxk/%E8%AE%BA%E6%96%871_1773837281618_44cz73lf.pdf?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Content-Sha256=UNSIGNED-PAYLOAD&X-Tos-Credential=AKTP25XSXGDvdxgQtgxSkAyC7V3f8omH3efNUkcxNzBpho8%2F20260324%2Fcn-shanghai%2Ftos%2Frequest&X-Tos-Date=20260324T064957Z&X-Tos-Expires=3600&X-Tos-SignedHeaders=host&X-Tos-Security-Token=nChAzV1A5WUxXVDhQYU9QUTV2.CiQKEE1YckFYRHRqNlZDNU1XaW4SEKKbmzBtf029lHEM6Vw6MIgQ4d6IzgYY8fqIzgYgz5r-6gcoATDPmv7qBzoEcm9vdEIDdG9zUglNZHg4ODg4ODhYAWAB.szwiGPJ6F3bfFbTIsDIU-3Vr84NiQ1wvFZsqdldVjgwPj1jo4mr-H42drv7Mzm2UWKR1LMOdfbKbslsyUlic_Q&X-Tos-Signature=07c67ccac8b7ed0dadc02e5cbedde3f5ea6b2cadbf8f58ff5c0c799c3c1f0863';

async function testOcrPdf() {
  console.log('开始测试 PDF 解析...\n');

  try {
    const startTime = Date.now();

    const result = await ocrPdf({
      image_url: TEST_PDF_URL,
      file_type: 'pdf',
      page_start: 0,
      page_num: 16,
      parse_mode: 'auto',
      table_mode: 'markdown',
      filter_header: 'true',
    });

    const duration = Date.now() - startTime;

    console.log('========== 解析成功 ==========\n');
    console.log(`耗时: ${duration}ms`);
    console.log(`Markdown 长度: ${result.markdown.length} 字符`);
    console.log(`结构化信息条数: ${result.detail.length}\n`);

    // 将结果保存到文件中以便查看完整内容
    const fs = require('fs');
    fs.writeFileSync('./test-visual-result.md', result.markdown);
    
    // 处理 result.detail，确保它是一个可以直接格式化的 JSON 对象
    let detailData = result.detail;
    if (typeof detailData === 'string') {
      try {
        // 如果是字符串，尝试解析为 JSON
        detailData = JSON.parse(detailData);
      } catch (error) {
        console.error('解析 detail 字符串失败:', error);
      }
    }
    
    fs.writeFileSync('./test-visual-result.json', JSON.stringify(detailData, null, 2));

    console.log('========== 输出已保存到文件 ==========');
    console.log('Markdown 内容已保存到: test-visual-result.md');
    console.log('结构化信息已保存到: test-visual-result.json');
    console.log('\n请查看文件以获取完整内容。');

  } catch (error) {
    console.error('========== 解析失败 ==========');
    if (error instanceof Error) {
      console.error(`错误: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testOcrPdf();
