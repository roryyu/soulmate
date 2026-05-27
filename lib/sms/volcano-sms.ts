/**
 * 火山引擎短信 SendSms 纯 API 原生调用
 * 文档: https://www.volcengine.com/docs/sms
 * 无SDK依赖，仅使用原生 HTTP POST 请求
 */

import * as crypto from 'crypto'

// 验证码有效期（毫秒）- 10分钟
const SMS_CODE_EXPIRY_MS = 10 * 60 * 1000

// 验证码长度
const SMS_CODE_LENGTH = 6

// 发送间隔（毫秒）- 60秒
const SMS_SEND_INTERVAL_MS = 60 * 1000

/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 生成 UTC 时间字符串
 * 格式: YYYYMMDDTHHMMSSZ
 * 火山引擎强制要求使用 UTC 时间
 */
function getUTCDateString(): string {
  const now = new Date()
  return now.toISOString().replace(/[:-]|\.\d{3}/g, '')
}

/**
 * HMAC-SHA256 签名生成
 * @param key 签名密钥
 * @param message 待签名消息
 * @returns 十六进制格式签名
 */
function hmacSHA256(key: string | Buffer, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex')
}

/**
 * 字符串转十六进制
 */
function stringToHex(str: string): string {
  return Buffer.from(str, 'utf8').toString('hex')
}

/**
 * 生成火山引擎 API 签名（核心逻辑）
 * 按照官方规范实现 HMAC-SHA256 签名算法
 * 注意：第一步必须将 SK 转成十六进制字符串作为初始密钥
 */
function generateSignature(
  accessKeySecret: string,
  timestamp: string,
  canonicalRequest: string
): string {
  // 1. 拼接签名字符串
  const credentialScope = `${timestamp.slice(0, 8)}/cn-north-1/volcSMS/request`
  const hashedCanonicalRequest = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex')

  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n')

  // 2. 衍生签名密钥 (kSecret -> kDate -> kRegion -> kService -> kSigning)
  // 重要：第一步需将 SK 转成十六进制格式作为初始密钥
  const kSecret = stringToHex(accessKeySecret)
  const kDate = hmacSHA256(Buffer.from(kSecret, 'hex'), timestamp.slice(0, 8))
  const kRegion = hmacSHA256(Buffer.from(kDate, 'hex'), 'cn-north-1')
  const kService = hmacSHA256(Buffer.from(kRegion, 'hex'), 'volcSMS')
  const kSigning = hmacSHA256(Buffer.from(kService, 'hex'), 'request')

  // 3. 生成最终签名
  return hmacSHA256(Buffer.from(kSigning, 'hex'), stringToSign)
}

interface SendSmsParams {
  phone: string
  code: string
  smsAccount: string
  sign: string
  templateId: string
  accessKeyId: string
  accessKeySecret: string
}

/**
 * Base64 字符串补全 = 符号
 * 火山引擎的 SK 经常会漏掉结尾的补全符号
 */
function padBase64(str: string): string {
  while (str.length % 4 !== 0) {
    str += '='
  }
  return str
}

/**
 * 发送短信验证码
 * 使用火山引擎 SendSms API 原生调用
 */
export async function sendSmsCode({
  phone,
  code,
  smsAccount,
  sign,
  templateId,
  accessKeyId,
  accessKeySecret,
}: SendSmsParams): Promise<{ success: boolean; message: string }> {
  // 固定接口信息
  const endpoint = 'sms.volcengineapi.com'
  const url = `https://${endpoint}?Action=SendSms&Version=2020-01-01`
  const timestamp = getUTCDateString()
  // 修复 SK 的 Base64 补全
  const sk = padBase64(accessKeySecret)

  // 构造请求体
  const requestBody = JSON.stringify({
    SmsAccount: smsAccount,
    Sign: sign,
    TemplateID: templateId,
    TemplateParam: JSON.stringify({ code }),
    PhoneNumbers: phone,
  })

  // 构造规范请求串
  const canonicalURI = '/'
  const canonicalQuery = 'Action=SendSms&Version=2020-01-01'
  const canonicalHeaders = [
    'content-type:application/json;charset=utf-8',
    `host:${endpoint}`,
    `x-date:${timestamp}`,
  ].join('\n')
  const signedHeaders = 'content-type;host;x-date'
  const payloadHash = crypto.createHash('sha256').update(requestBody).digest('hex')

  // 注意：规范请求串中 canonicalHeaders 后需要加两个换行
  const canonicalRequest = [
    'POST',
    canonicalURI,
    canonicalQuery,
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n')

  // 生成签名
  const signature = generateSignature(sk, timestamp, canonicalRequest)

  // 构造 Authorization 头
  const credentialScope = `${timestamp.slice(0, 8)}/cn-north-1/volcSMS/request`
  const authorization = `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Date': timestamp,
        'Authorization': authorization,
      },
      body: requestBody,
    })

    const data = await response.json()

    // 判断发送结果
    if (data.ResponseMetadata && data.ResponseMetadata.Error) {
      const error = data.ResponseMetadata.Error
      // 常见错误处理
      switch (error.CodeN) {
        case 10000:
          return { success: true, message: '短信发送成功' }
        case 100002:
          return { success: false, message: '参数缺失，请检查配置' }
        case 100025:
          return { success: false, message: 'AK/SK 错误，请检查密钥配置' }
        default:
          return { success: false, message: error.Message || '短信发送失败' }
      }
    }

    return { success: true, message: '短信发送成功' }
  } catch (error) {
    console.error('发送短信失败:', error)
    return { success: false, message: '短信服务异常' }
  }
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  // 中国大陆手机号格式: 1开头，11位数字
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 获取验证码过期时间
 */
export function getCodeExpiry(): Date {
  return new Date(Date.now() + SMS_CODE_EXPIRY_MS)
}

/**
 * 获取发送间隔
 */
export function getSendInterval(): number {
  return SMS_SEND_INTERVAL_MS
}

export { SMS_CODE_EXPIRY_MS, SMS_SEND_INTERVAL_MS }
