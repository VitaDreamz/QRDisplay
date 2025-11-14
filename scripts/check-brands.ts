import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBrands() {
  // Check what brands exist
  const orgs = await prisma.organization.findMany({
    where: {
      orgId: {
        in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4']
      }
    }
  });
  
  console.log('\n📦 Organizations:');
  orgs.forEach(o => console.log(`  ${o.orgId} (id: ${o.id}) - ${o.name}`));
  
  // Check products
  const products = await prisma.product.findMany({
    where: {
      orgId: {
        in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4']
      },
      active: true
    }
  });
  
  console.log('\n📦 Products:');
  products.forEach(p => console.log(`  ${p.sku} - ${p.name} (orgId: ${p.orgId})`));
  
  // Check SID-003 partnerships
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-003' },
    include: {
      brandPartnerships: {
        include: {
          brand: true
        }
      }
    }
  });
  
  console.log('\n🏪 SID-003 Brand Partnerships:');
  store?.brandPartnerships.forEach(p => {
    console.log(`  Brand DB ID: ${p.brandId}`);
    console.log(`  Brand OrgID: ${p.brand.orgId}`);
    console.log(`  Brand Name: ${p.brand.name}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkBrands().catch(console.error);
