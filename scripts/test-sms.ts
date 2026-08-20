import 'dotenv/config';
import { sendSmsCode } from '../lib/sms/volcano-sms';

/**
 * 火山引擎短信 SendSms API 测试脚本
 * 调用实际业务代码 lib/sms/volcano-sms.ts
 * 
 * 使用前请确保已配置以下环境变量：
 * - VOLCANO_SMS_ACCESS_KEY_ID: AccessKey ID
 * - VOLCANO_SMS_ACCESS_KEY_SECRET: Secret Access Key
 * - VOLCANO_SMS_ACCOUNT: 消息组ID
 * - VOLCANO_SMS_SIGN: 短信签名
 * - VOLCANO_SMS_TEMPLATE_ID: 模板ID
 */

// 测试手机号 - 请修改为你要测试的手机号
const TEST_PHONE_NUMBER = '15051899520';

// 测试验证码
const TEST_CODE = '123456';

/**
 * 发送短信测试
 */
async function testSendSms() {
  console.log('========== 开始测试火山引擎短信发送 ==========\n');

  // 从环境变量读取配置
  const accessKeyId = process.env.VOLCANO_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.VOLCANO_SMS_ACCESS_KEY_SECRET;
  const smsAccount = process.env.VOLCANO_SMS_ACCOUNT;
  const sign = process.env.VOLCANO_SMS_SIGN;
  const templateId = process.env.VOLCANO_SMS_TEMPLATE_ID;

  // 打印配置信息（隐藏敏感部分）
  console.log('配置信息:');
  console.log(`  AK: ${accessKeyId?.slice(0, 8)}...`);
  console.log(`  SK: ${accessKeySecret?.slice(0, 8)}...`);
  console.log(`  消息组ID: ${smsAccount}`);
  console.log(`  签名: ${sign}`);
  console.log(`  模板ID: ${templateId}`);
  console.log(`  测试手机号: ${TEST_PHONE_NUMBER}`);
  console.log(`  测试验证码: ${TEST_CODE}\n`);

  // 验证配置
  if (!accessKeyId || !accessKeySecret || !smsAccount || !sign || !templateId) {
    console.error('❌ 错误: 缺少必要的环境变量配置');
    console.error('请检查 .env 文件中的 VOLCANO_SMS_* 配置项');
    process.exit(1);
  }

  try {
    const startTime = Date.now();

    console.log('调用 lib/sms/volcano-sms.ts 中的 sendSmsCode 函数...\n');

    // 直接调用业务代码，和实际线上使用完全一致
    const result = await sendSmsCode({
      phone: TEST_PHONE_NUMBER,
      code: TEST_CODE,
      smsAccount,
      sign,
      templateId,
      accessKeyId,
      accessKeySecret,
    });

    const duration = Date.now() - startTime;

    console.log('========== 请求结果 ==========\n');
    console.log(`请求耗时: ${duration}ms\n`);

    if (result.success) {
      console.log('✅ 短信发送成功！');
      console.log(`返回信息: ${result.message}`);
      console.log(`请查收手机 ${TEST_PHONE_NUMBER} 的短信\n`);
    } else {
      console.log('❌ 短信发送失败！');
      console.log(`错误信息: ${result.message}\n`);

      // 常见错误提示
      if (result.message.includes('AK/SK')) {
        console.log('💡 排错建议: 检查 AK/SK 是否正确，SK 结尾是否有 ==');
      } else if (result.message.includes('参数缺失')) {
        console.log('💡 排错建议: 检查所有必填参数是否都已配置');
      } else if (result.message.includes('消息组')) {
        console.log('💡 排错建议: SmsAccount (消息组ID) 错误');
      } else if (result.message.includes('签名')) {
        console.log('💡 排错建议: 签名未审核或填写错误');
      } else if (result.message.includes('模板')) {
        console.log('💡 排错建议: 模板未审核或填写错误');
      }

      process.exit(1);
    }

  } catch (error) {
    console.log('========== 发送异常 ==========\n');
    if (error instanceof Error) {
      console.error(`错误: ${error.message}`);
      console.error(`堆栈: ${error.stack}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testSendSms();
