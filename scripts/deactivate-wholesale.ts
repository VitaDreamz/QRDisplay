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
  console.log(`Deactivating wholesale products for orgId=${targetOrgId}`);

  // Set all wholesale-box products to active=false
  const result = await prisma.product.updateMany({
    where: {
      orgId: targetOrgId,
      productType: 'wholesale-box' as any,
    },
    data: {
      active: false,
    },
  });

  console.log(`Deactivated ${result.count} wholesale products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
