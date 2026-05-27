import crypto from 'crypto';
import { prisma } from './prisma';

// 支付宝配置
export const alipayConfig = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  charset: 'UTF-8',
  signType: 'RSA2' as const,
};

// 网关 action：支付宝要求 charset 出现在 URL 查询串中，否则常见 invalid-signature 提示
function gatewayActionWithCharset(gateway: string, charset: string): string {
  const u = new URL(gateway);
  u.searchParams.set('charset', charset);
  return u.toString();
}

// 隐藏域 value 需转义，避免 &、" 等破坏 biz_content 导致服务端验签失败
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

// 格式化私钥（添加头尾）
function formatPrivateKey(privateKey: string): string {
  const key = privateKey.replace(/\s+/g, '');
  let formatted = '';
  for (let i = 0; i < key.length; i += 64) {
    formatted += key.slice(i, i + 64) + '\n';
  }
  return `-----BEGIN RSA PRIVATE KEY-----\n${formatted}-----END RSA PRIVATE KEY-----`;
}

// 格式化公钥（添加头尾）
function formatPublicKey(publicKey: string): string {
  const key = publicKey.replace(/\s+/g, '');
  let formatted = '';
  for (let i = 0; i < key.length; i += 64) {
    formatted += key.slice(i, i + 64) + '\n';
  }
  return `-----BEGIN PUBLIC KEY-----\n${formatted}-----END PUBLIC KEY-----`;
}

// RSA2 签名
export function rsaSign(content: string): string {
  const privateKey = formatPrivateKey(alipayConfig.privateKey);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(content, 'utf8');
  return sign.sign(privateKey, 'base64');
}

// RSA2 验签
export function rsaVerify(content: string, sign: string): boolean {
  try {
    const publicKey = formatPublicKey(alipayConfig.alipayPublicKey);
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(content, 'utf8');
    return verify.verify(publicKey, sign, 'base64');
  } catch (error) {
    console.error('验签失败:', error);
    return false;
  }
}

// 对参数进行排序并拼接
export function buildQueryString(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '').sort();
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    pairs.push(`${key}=${encodeURIComponent(params[key])}`);
  }
  return pairs.join('&');
}

// 构建待签名字符串
export function buildSignContent(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '').sort();
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    pairs.push(`${key}=${params[key]}`);
  }
  return pairs.join('&');
}

// 生成商户订单号
export function generateOutTradeNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EDU${timestamp}${random}`;
}

// 创建支付请求表单
export function createPaymentForm(params: {
  outTradeNo: string;
  totalAmount: string;
  subject: string;
  body?: string;
  returnUrl?: string;
  notifyUrl?: string;
}): string {
  const bizContent: Record<string, any> = {
    out_trade_no: params.outTradeNo,
    total_amount: params.totalAmount,
    subject: params.subject,
    product_code: 'FAST_INSTANT_TRADE_PAY',
  };
  
  if (params.body) {
    bizContent.body = params.body;
  }

  const requestParams: Record<string, any> = {
    app_id: alipayConfig.appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: alipayConfig.charset,
    sign_type: alipayConfig.signType,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
  };

  if (params.returnUrl) {
    requestParams.return_url = params.returnUrl;
  }

  if (params.notifyUrl) {
    requestParams.notify_url = params.notifyUrl;
  }

  // 生成签名
  const signContent = buildSignContent(requestParams);
  const sign = rsaSign(signContent);
  requestParams.sign = sign;

  // 构建 HTML 表单：accept-charset 保证 POST 体为 UTF-8，与签名时 utf8 一致
  const actionUrl = gatewayActionWithCharset(alipayConfig.gateway, alipayConfig.charset);
  let formHtml = `<form name="alipaysubmit" action="${escapeHtmlAttr(actionUrl)}" method="POST" accept-charset="UTF-8">`;
  for (const key in requestParams) {
    const raw = String(requestParams[key]);
    formHtml += `<input type="hidden" name="${escapeHtmlAttr(key)}" value="${escapeHtmlAttr(raw)}" />`;
  }
  formHtml += `<input type="submit" value="确认" style="display:none;" /></form>`;
  formHtml += `<script>document.forms['alipaysubmit'].submit();</script>`;

  return formHtml;
}

// 验证异步通知签名
export async function verifyNotifySign(params: Record<string, any>): Promise<boolean> {
  try {
    const { app_id, out_trade_no, total_amount, sign, sign_type } = params;
    
    // 验证 app_id
    if (app_id !== alipayConfig.appId) {
      console.error('App ID 不匹配');
      return false;
    }
    
    // 复制参数并移除 sign 和 sign_type
    const verifyParams = { ...params };
    delete verifyParams.sign;
    delete verifyParams.sign_type;
    
    // 构建待验签字符串
    const signContent = buildSignContent(verifyParams);
    
    // 验签
    const isValid = rsaVerify(signContent, sign);
    if (!isValid) {
      console.error('签名验证失败');
      return false;
    }
    
    // 查询订单验证金额
    const order = await prisma.order.findUnique({
      where: { outTradeNo: out_trade_no },
    });
    
    if (!order) {
      console.error('订单不存在');
      return false;
    }
    
    // 验证金额是否一致
    if (parseFloat(total_amount) !== parseFloat(order.totalAmount.toString())) {
      console.error('订单金额不匹配');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('验签失败:', error);
    return false;
  }
}

// 处理支付成功后的业务逻辑（含会员开通与积分充值）
export async function handlePaymentSuccess(outTradeNo: string, tradeNo: string, params: Record<string, any>) {
  return await prisma.$transaction(async (tx) => {
    // 含关联产品信息，用于判断权益分发
    const current = await tx.order.findUnique({
      where: { outTradeNo },
      include: { product: true },
    });

    // 幂等：已支付则直接返回（避免同步回跳与异步通知并发重复写）
    if (current?.status === 'PAID') {
      return current;
    }

    // 更新订单状态
    const order = await tx.order.update({
      where: { outTradeNo },
      data: {
        status: 'PAID',
        tradeNo,
        payMethod: 'ALIPAY',
        paidAt: new Date(),
      },
      include: { product: true },
    });

    // 创建支付记录
    await tx.paymentRecord.create({
      data: {
        orderId: order.id,
        outTradeNo,
        tradeNo,
        tradeStatus: params.trade_status,
        totalAmount: parseFloat(params.total_amount),
        receiptAmount: params.receipt_amount ? parseFloat(params.receipt_amount) : null,
        buyerPayAmount: params.buyer_pay_amount ? parseFloat(params.buyer_pay_amount) : null,
        buyerId: params.buyer_id,
        buyerLogonId: params.buyer_logon_id,
        gmtCreate: params.gmt_create ? new Date(params.gmt_create) : null,
        gmtPayment: params.gmt_payment ? new Date(params.gmt_payment) : null,
        notifyId: params.notify_id,
        notifyTime: params.notify_time ? new Date(params.notify_time) : null,
        rawNotifyData: JSON.stringify(params),
      },
    });

    // 根据产品类型分发会员/积分权益
    if (order.userId && order.product) {
      const product = order.product;

      if (product.type === 'MEMBERSHIP' && product.duration) {
        // 开通/续费会员：若当前有有效会员则从到期时间延续，否则从现在开始
        const now = new Date();
        const existing = await tx.userMembership.findFirst({
          where: {
            userId: order.userId,
            status: 'ACTIVE',
            endAt: { gt: now },
          },
        });

        const startAt = existing ? existing.endAt : now;
        const endAt = new Date(startAt.getTime() + product.duration * 24 * 60 * 60 * 1000);

        // 原有有效会员状态改为 RENEWED，新建最新会员记录
        if (existing) {
          await tx.userMembership.update({
            where: { id: existing.id },
            data: { status: 'RENEWED' },
          });
        }

        await tx.userMembership.create({
          data: {
            userId: order.userId,
            productId: product.id,
            orderId: order.id,
            startAt,
            endAt,
            status: 'ACTIVE',
          },
        });

        console.log(`会员开通成功：userId=${order.userId}，到期时间=${endAt.toISOString()}`);

      } else if (product.type === 'CREDIT_PACKAGE' && product.credits) {
        // 充值积分
        const creditEntry = await tx.userCredit.findUnique({ where: { userId: order.userId } });
        const currentBalance = creditEntry?.balance ?? 0;
        const newBalance = currentBalance + product.credits;

        await tx.userCredit.upsert({
          where: { userId: order.userId },
          update: { balance: newBalance },
          create: { userId: order.userId, balance: product.credits },
        });

        // 记录积分流水
        await tx.creditTransaction.create({
          data: {
            userId: order.userId,
            amount: product.credits,
            type: 'PURCHASE',
            description: `购买积分包「${product.name}」，充值 ${product.credits} 积分`,
            orderId: order.id,
            balanceAfter: newBalance,
          },
        });

        console.log(`积分充值成功：userId=${order.userId}，充值=${product.credits}，新余额=${newBalance}`);
      }
    }

    return order;
  });
}