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
  console.log(`Hiding LunaBerry products for orgId=${targetOrgId}`);

  // Find all LunaBerry SKUs (VD-LB-*)
  const lunaProducts = await prisma.product.findMany({
    where: {
      orgId: targetOrgId,
      sku: { startsWith: 'VD-LB-' },
    },
  });

  console.log(`Found ${lunaProducts.length} LunaBerry products:`, lunaProducts.map((p) => p.sku));

  // Set them all to active=false
  const result = await prisma.product.updateMany({
    where: {
      orgId: targetOrgId,
      sku: { startsWith: 'VD-LB-' },
    },
    data: {
      active: false,
    },
  });

  console.log(`Deactivated ${result.count} LunaBerry products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
