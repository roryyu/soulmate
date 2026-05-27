import { prisma } from '../lib/prisma';

async function main() {
  console.log('开始初始化产品数据...');

  // 清理现有产品数据
  await prisma.product.deleteMany({});

  // 创建会员套餐
  const products = await prisma.product.createMany({
    data: [
      {
        name: '月度会员',
        description: '解锁研灵犀全部功能30天',
        price: 99.0,
        originalPrice: null,
        type: 'MEMBERSHIP',
        duration: 30,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: '季度会员',
        description: '解锁研灵犀全部功能90天，立省77元',
        price: 199.0,
        originalPrice: 99 * 3,
        type: 'MEMBERSHIP',
        duration: 90,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: '年度会员',
        description: '解锁研灵犀全部功能365天，立省689元',
        price: 499.0,
        originalPrice: 99 * 12,
        type: 'MEMBERSHIP',
        duration: 365,
        isActive: true,
        sortOrder: 3,
      },
    ],
  });

  console.log(`成功创建 ${products.count} 个产品套餐`);
}

main()
  .catch((e) => {
    console.error('初始化产品数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });