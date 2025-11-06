import { PrismaClient } from '@prisma/client';

// Allow overriding DB URL via CLI: --url "postgres://..."
function getDbUrlFromArgs(): string | undefined {
  const urlFlagIndex = process.argv.findIndex((a) => a === '--url');
  if (urlFlagIndex >= 0 && process.argv[urlFlagIndex + 1]) {
    return process.argv[urlFlagIndex + 1];
  }
  return undefined;
}

const cliUrl = getDbUrlFromArgs();
const prisma = new PrismaClient(
  cliUrl ? { datasources: { db: { url: cliUrl } } } : undefined
);

async function main() {
  const targetOrgId = process.env.ORG_ID || 'ORG-VITADREAMZ';
  const effectiveDbUrl = cliUrl || process.env.DATABASE_URL || '(not set)';
  console.log(`Adding 4ct wholesale boxes for orgId=${targetOrgId}`);
  console.log(`Using DATABASE_URL: ${effectiveDbUrl.substring(0, 48)}...`);

  // Sanity check DB connectivity early
  try {
    const dbInfo: any = await prisma.$queryRawUnsafe(
      'select current_database() as db, current_user as user'
    );
    console.log(`Connected to DB='${dbInfo?.[0]?.db}' as user='${dbInfo?.[0]?.user}'`);
  } catch (e) {
    console.error('Failed to connect to the database.');
    console.error('Hint: You can run with a specific URL:');
    console.error("  npx tsx scripts/add-4ct-wholesale.ts --url 'postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require'");
    throw e;
  }

  const org = await prisma.organization.findFirst({ where: { orgId: targetOrgId } });
  if (!org) {
    throw new Error(`Organization not found for orgId=${targetOrgId}`);
  }

  // 4ct Boxes (20 units per box)
  const wholesaleBoxes = [
    {
      sku: 'VD-SB-4-BX',
      name: 'Slumber Berry - 4ct Box',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 20)',
      category: 'Sleep',
      price: 4.99,
      imageUrl: '/images/products/4ct-SlumberBerry-Bag.png',
      active: false, // Hidden by default since wholesale
      featured: false,
      productType: 'wholesale-box' as const,
      unitsPerBox: 20,
      wholesalePrice: 45.0,
      retailPrice: 99.8,
    },
    {
      sku: 'VD-BB-4-BX',
      name: 'Bliss Berry - 4ct Box',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 20)',
      category: 'Relax',
      price: 3.99,
      imageUrl: '/images/products/4ct-BlissBerry-Bag.png',
      active: false,
      featured: false,
      productType: 'wholesale-box' as const,
      unitsPerBox: 20,
      wholesalePrice: 40.0,
      retailPrice: 79.8,
    },
    {
      sku: 'VD-CC-4-BX',
      name: 'Berry Chill - 4ct Box',
      description: 'D9 THC + Herbals - ChillOut Chewz (Box of 20)',
      category: 'ChillOut',
      price: 5.99,
      imageUrl: '/images/products/4ct-ChillOutChewz-Bag.png',
      active: false,
      featured: false,
      productType: 'wholesale-box' as const,
      unitsPerBox: 20,
      wholesalePrice: 54.0,
      retailPrice: 119.8,
    },
  ];

  const results: Array<{ sku: string; action: 'created' | 'updated' }> = [];
  for (const product of wholesaleBoxes) {
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
