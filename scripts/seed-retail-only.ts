import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetOrgId = process.env.ORG_ID || 'ORG-VITADREAMZ';
  console.log(`Seeding retail products for orgId=${targetOrgId}`);

  const org = await prisma.organization.findFirst({ where: { orgId: targetOrgId } });
  if (!org) {
    throw new Error(`Organization not found for orgId=${targetOrgId}`);
  }

  const retailProducts = [
    {
      sku: 'VD-SB-30',
      name: 'Slumber Berry - 30ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 29.99,
      imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
      active: true,
      featured: true,
      productType: 'retail' as const,
    },
    {
      sku: 'VD-SB-60',
      name: 'Slumber Berry - 60ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 54.99,
      imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
      active: true,
      featured: true,
      productType: 'retail' as const,
    },
    {
      sku: 'VD-BB-30',
      name: 'Bliss Berry - 30ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 24.99,
      imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
      active: true,
      featured: false,
      productType: 'retail' as const,
    },
    {
      sku: 'VD-BB-60',
      name: 'Bliss Berry - 60ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 44.99,
      imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
      active: true,
      featured: false,
      productType: 'retail' as const,
    },
    {
      sku: 'VD-CC-20',
      name: 'Berry Chill - 20ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 24.95,
      imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png',
      active: true,
      featured: false,
      productType: 'retail' as const,
    },
    {
      sku: 'VD-CC-60',
      name: 'Berry Chill - 60ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 59.99,
      imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png',
      active: true,
      featured: false,
      productType: 'retail' as const,
    },
  ];

  const results: Array<{ sku: string; action: 'created' | 'updated' }> = [];
  for (const product of retailProducts) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
    if (existing) {
      await prisma.product.update({
        where: { sku: product.sku },
        data: { ...product, orgId: org.orgId, msrp: null },
      });
      results.push({ sku: product.sku, action: 'updated' });
    } else {
      await prisma.product.create({
        data: { ...product, orgId: org.orgId, msrp: null },
      });
      results.push({ sku: product.sku, action: 'created' });
    }
  }

  console.log('Done:', results);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
