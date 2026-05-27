import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化种子数据...');

  // ── 1. 会员套餐产品 ──────────────────────────────────────────
  const membershipProducts = [
    {
      name: '月度会员',
      description: '30天内畅享所有AI功能，按需试用',
      price: 126,
      originalPrice: null,
      type: 'MEMBERSHIP',
      duration: 30,
      credits: null,
      sortOrder: 10,
    },
    {
      name: '季度会员',
      description: '90天会员，推荐长期数字疗愈项目使用',
      price: 299,
      // 中文注释：原价按「月度×3 天」折算，便于前台划线展示
      originalPrice: 126 * 3,
      type: 'MEMBERSHIP',
      duration: 90,
      credits: null,
      sortOrder: 20,
    },
    {
      name: '测试会员（1天）',
      description: '仅用于测试：1天会员',
      price: 0.01,
      originalPrice: null,
      type: 'MEMBERSHIP',
      duration: 1,
      credits: null,
      sortOrder: 35,
    },
  ];

  for (const product of membershipProducts) {
    // 中文注释：使用固定 seed id，且每次 seed 都同步更新价格/时长等字段，避免历史数据“种下去就改不动”
    await prisma.product.upsert({
      where: { id: `seed-membership-${product.sortOrder}` },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        type: product.type,
        duration: product.duration,
        credits: product.credits,
        sortOrder: product.sortOrder,
      },
      create: { id: `seed-membership-${product.sortOrder}`, ...product },
    });
    console.log(`  ✔ 会员产品：${product.name}`);
  }

  // ── 2. 积分包产品 ─────────────────────────────────────────────
  const creditProducts = [
    {
      name: '尝鲜积分包',
      description: '适合初次体验，少量试用',
      price: 19.9,
      originalPrice: 29.9,
      type: 'CREDIT_PACKAGE',
      duration: null,
      credits: 100,
      sortOrder: 40,
    },
    {
      name: '标准积分包',
      description: '日常使用首选，性价比最高',
      price: 69.9,
      originalPrice: 99.9,
      type: 'CREDIT_PACKAGE',
      duration: null,
      credits: 500,
      sortOrder: 50,
    },
    {
      name: '测试积分包（1积分）',
      description: '仅用于测试：1积分',
      price: 0.01,
      originalPrice: null,
      type: 'CREDIT_PACKAGE',
      duration: null,
      credits: 1,
      sortOrder: 55,
    },
  ];

  for (const product of creditProducts) {
    // 中文注释：同上，seed 重跑时同步更新商品字段，保持测试商品/价格随配置演进
    await prisma.product.upsert({
      where: { id: `seed-credit-${product.sortOrder}` },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        type: product.type,
        duration: product.duration,
        credits: product.credits,
        sortOrder: product.sortOrder,
      },
      create: { id: `seed-credit-${product.sortOrder}`, ...product },
    });
    console.log(`  ✔ 积分包：${product.name}（${product.credits} 积分）`);
  }

  // ── 3. AI 操作积分消耗配置 ────────────────────────────────────
  const aiConfigs = [
    { operationType: 'IDEATION',  creditCost: 20, description: '选题灵感生成' },
    { operationType: 'SEARCH',    creditCost: 10, description: 'CNKI检索式生成' },
    { operationType: 'ANALYZE',   creditCost: 30, description: '文献智能分析' },
    { operationType: 'CHAT',      creditCost: 10, description: '文献问答对话' },
    { operationType: 'WRITING',   creditCost: 20, description: '研究写作生成' },
    { operationType: 'POLISHING', creditCost: 10, description: '论文润色操作' },
    { operationType: 'OUTLINE',   creditCost: 50, description: '综述大纲生成（含RAG）' },
    {
      operationType: 'OCR_UPLOAD',
      creditCost: 10,
      description: '文献上传 PDF OCR：每满100页一档，不足100页按一档；本数值为每档积分',
    },
  ];

  for (const config of aiConfigs) {
    await prisma.aIOperationConfig.upsert({
      where: { operationType: config.operationType },
      update: { creditCost: config.creditCost, description: config.description },
      create: { ...config, isActive: true },
    });
    console.log(`  ✔ AI 配置：${config.operationType} = ${config.creditCost} 积分`);
  }

  // ── 4. 问题反馈类型 ─────────────────────────────────────────────
  const feedbackTypes = [
    {
      name: '功能建议',
      description: '对新功能或改进的建议',
      sortOrder: 10,
    },
    {
      name: 'Bug 反馈',
      description: '系统错误或异常问题',
      sortOrder: 20,
    },
    {
      name: '使用问题',
      description: '功能使用中的疑问',
      sortOrder: 30,
    },
    {
      name: '性能问题',
      description: '系统响应慢、卡顿等性能问题',
      sortOrder: 40,
    },
    {
      name: '其他',
      description: '其他类型的反馈',
      sortOrder: 50,
    },
  ];

  for (const type of feedbackTypes) {
    await prisma.feedbackType.upsert({
      where: { id: `seed-feedback-type-${type.sortOrder}` },
      update: {
        name: type.name,
        description: type.description,
        sortOrder: type.sortOrder,
      },
      create: { id: `seed-feedback-type-${type.sortOrder}`, ...type },
    });
    console.log(`  ✔ 反馈类型：${type.name}`);
  }

  console.log('\n✅ 种子数据初始化完成！');
  console.log('\n产品汇总：');
  console.log('  会员套餐：月度 ¥126 / 季度 ¥299 / 年度 ¥199.9 / 测试会员 ¥0.01（1 天）');
  console.log('  积分包  ：尝鲜 100 积分 ¥19.9 / 标准 500 积分 ¥69.9 / 测试 1 积分 ¥0.01');
  console.log('\n反馈类型：');
  console.log('  功能建议 / Bug 反馈 / 使用问题 / 性能问题 / 其他');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
