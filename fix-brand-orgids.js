const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map SKU prefix to brand orgId
const BRAND_MAP = {
  'VD-SB': 'ORG-VSV3I', // Slumber Berry
  'VD-BB': 'ORG-VBEN2', // Bliss Berry  
  'VD-CC': 'ORG-VC9L4'  // Berry Chill
};

async function fixBrandOrgIds() {
  const partnerships = await prisma.storeBrandPartnership.findMany({
    where: { storeId: 'SID-004' }
  });
  
  console.log('Fixing', partnerships.length, 'partnerships...\n');
  
  for (const partnership of partnerships) {
    // Get first sample SKU to determine brand
    const firstSample = partnership.availableSamples[0];
    const prefix = firstSample?.substring(0, 5); // e.g., "VD-SB"
    const brandOrgId = BRAND_MAP[prefix];
    
    if (brandOrgId) {
      console.log(`Partnership ${partnership.id}:`);
      console.log(`  Samples: ${partnership.availableSamples.join(', ')}`);
      console.log(`  Setting brandOrgId: ${brandOrgId}\n`);
      
      await prisma.storeBrandPartnership.update({
        where: { id: partnership.id },
        data: { brandOrgId }
      });
    }
  }
  
  console.log('✅ Done!');
  await prisma.$disconnect();
}

fixBrandOrgIds();
