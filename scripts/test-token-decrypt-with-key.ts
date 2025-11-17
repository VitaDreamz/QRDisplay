/**
 * Test if the tokens in production database can be decrypted with the current key
 */

import { PrismaClient } from '@prisma/client';
import { decrypt } from '../lib/encryption';

const prisma = new PrismaClient();

async function test() {
  console.log('\n🔐 Testing Token Decryption with Production Database\n');
  console.log('ENCRYPTION_KEY from env:', process.env.ENCRYPTION_KEY?.substring(0, 10) + '...');
  console.log('');

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

  for (const brand of brands) {
    console.log(`📦 ${brand.name} (${brand.orgId})`);
    console.log(`   Domain: ${brand.shopifyStoreName}`);
    console.log(`   Encrypted token exists: ${!!brand.shopifyAccessToken}`);
    console.log(`   Encrypted length: ${brand.shopifyAccessToken?.length}`);
    
    if (brand.shopifyAccessToken) {
      try {
        const decrypted = decrypt(brand.shopifyAccessToken);
        console.log(`   ✅ Decryption: SUCCESS`);
        console.log(`   Decrypted length: ${decrypted.length}`);
        console.log(`   Preview: ${decrypted.substring(0, 10)}...${decrypted.substring(decrypted.length - 4)}`);
        console.log(`   Valid format: ${decrypted.startsWith('shpat_') ? 'YES' : 'NO (Expected shpat_)'}`);
      } catch (error: any) {
        console.log(`   ❌ Decryption: FAILED`);
        console.log(`   Error: ${error.message}`);
      }
    } else {
      console.log(`   ⚠️  No token stored`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

test().catch(console.error);
