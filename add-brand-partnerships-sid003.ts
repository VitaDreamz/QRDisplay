import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres'
    }
  }
});

async function main() {
  console.log('Adding brand partnerships to SID-003...\n');
  
  // Get the store's internal ID
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-003' },
    select: { id: true, storeId: true, storeName: true }
  });
  
  if (!store) {
    console.error('Store SID-003 not found!');
    return;
  }
  
  console.log(`Found store: ${store.storeName} (${store.storeId}), ID: ${store.id}\n`);
  
  // Get all three brands
  const brands = await prisma.organization.findMany({
    where: {
      orgId: {
        in: ['ORG-VSCA1', 'ORG-VBDOW', 'ORG-VCVR4']
      }
    },
    select: {
      id: true,
      orgId: true,
      name: true
    }
  });
  
  console.log(`Found ${brands.length} brands:\n`);
  brands.forEach(b => console.log(`  - ${b.name} (${b.orgId}), ID: ${b.id}`));
  console.log();
  
  // Add partnerships for each brand
  for (const brand of brands) {
    const existing = await prisma.storeBrandPartnership.findFirst({
      where: {
        storeId: store.id,
        brandId: brand.id
      }
    });
    
    if (existing) {
      console.log(`✓ Partnership already exists for ${brand.name}`);
      // Update to active if it's not
      if (!existing.active) {
        await prisma.storeBrandPartnership.update({
          where: { id: existing.id },
          data: { active: true }
        });
        console.log(`  → Activated partnership`);
      }
    } else {
      const partnership = await prisma.storeBrandPartnership.create({
        data: {
          storeId: store.id,
          brandId: brand.id,
          active: true,
        }
      });
      console.log(`✅ Created partnership for ${brand.name} (ID: ${partnership.id})`);
    }
  }
  
  console.log('\n✨ All brand partnerships added!');
  
  // Verify
  const partnerships = await prisma.storeBrandPartnership.findMany({
    where: { storeId: store.id },
    include: {
      brand: {
        select: {
          orgId: true,
          name: true
        }
      }
    }
  });
  
  console.log(`\nFinal partnerships for ${store.storeName}:`);
  partnerships.forEach(p => {
    console.log(`  - ${p.brand.name} (${p.brand.orgId}) - Active: ${p.active}`);
  });
}

main().finally(() => prisma.$disconnect());
