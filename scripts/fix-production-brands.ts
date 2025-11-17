/**
 * Delete test brands from production and add real brands with products
 */

import { PrismaClient } from '@prisma/client';

const productionDb = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres"
    }
  }
});

const multibrandDb = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.dowalcgdjqcjsjkcbidf:MultiBrand2025@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function main() {
  console.log('\n🗑️  Step 1: Deleting test brands from production...\n');
  
  const testBrands = ['ORG-VBTEST2', 'ORG-VCTEST3', 'ORG-VSTEST1'];
  
  for (const orgId of testBrands) {
    try {
      await productionDb.organization.delete({
        where: { orgId }
      });
      console.log(`✅ Deleted ${orgId}`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        console.log(`⚠️  ${orgId} not found (already deleted)`);
      } else {
        console.error(`❌ Error deleting ${orgId}:`, error.message);
      }
    }
  }

  console.log('\n📥 Step 2: Fetching real brands from multibrand database...\n');
  
  const realBrandIds = ['ORG-VCVR4', 'ORG-VBDOW', 'ORG-VSCA1'];
  
  const brands = await multibrandDb.organization.findMany({
    where: { orgId: { in: realBrandIds } }
  });
  console.log(`Found ${brands.length} brands`);

  const products = await multibrandDb.product.findMany({
    where: { orgId: { in: realBrandIds } }
  });
  console.log(`Found ${products.length} products\n`);

  console.log('💾 Step 3: Creating brands in production...\n');
  
  for (const brand of brands) {
    try {
      await productionDb.organization.create({
        data: brand
      });
      console.log(`✅ Created ${brand.name} (${brand.orgId})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${brand.orgId} already exists, skipping`);
      } else {
        console.error(`❌ Error creating ${brand.orgId}:`, error.message);
      }
    }
  }

  console.log('\n💾 Step 4: Creating products in production...\n');
  
  for (const product of products) {
    try {
      await productionDb.product.create({
        data: product
      });
      console.log(`✅ Created ${product.sku}: ${product.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${product.sku} already exists, skipping`);
      } else {
        console.error(`❌ Error creating ${product.sku}:`, error.message);
      }
    }
  }

  console.log('\n📊 Step 5: Verifying production database...\n');
  
  const prodBrands = await productionDb.organization.findMany({
    where: { type: 'client' }
  });
  
  for (const brand of prodBrands) {
    const productCount = await productionDb.product.count({
      where: { orgId: brand.orgId }
    });
    console.log(`${brand.orgId} - ${brand.name}: ${productCount} products`);
  }

  console.log('\n✨ Migration complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await productionDb.$disconnect();
    await multibrandDb.$disconnect();
  });
