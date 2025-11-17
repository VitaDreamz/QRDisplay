import { PrismaClient } from '@prisma/client';
import { decryptSafe } from '../lib/encryption';

const prisma = new PrismaClient();

async function test() {
  const brands = await prisma.organization.findMany({
    where: {
      orgId: { in: ['ORG-VCVR4', 'ORG-VBDOW', 'ORG-VSCA1'] },
    },
    select: {
      orgId: true,
      name: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
    },
  });

  console.log('\n🔐 Testing Shopify Token Decryption:\n');

  for (const brand of brands) {
    console.log(`\n📦 ${brand.name} (${brand.orgId})`);
    console.log(`   Domain: ${brand.shopifyStoreName || 'MISSING'}`);
    console.log(`   Encrypted token: ${brand.shopifyAccessToken ? 'EXISTS' : 'MISSING'}`);
    console.log(`   Encrypted length: ${brand.shopifyAccessToken?.length || 0}`);
    
    if (brand.shopifyAccessToken) {
      try {
        const decrypted = decryptSafe(brand.shopifyAccessToken);
        console.log(`   Decrypted: ${decrypted ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Decrypted length: ${decrypted?.length || 0}`);
        console.log(`   Starts with: ${decrypted?.substring(0, 10) || 'N/A'}...`);
      } catch (error: any) {
        console.log(`   ❌ Decryption error: ${error.message}`);
      }
    }
  }

  await prisma.$disconnect();
}

test();
