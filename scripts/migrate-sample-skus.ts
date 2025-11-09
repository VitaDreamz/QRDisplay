import prisma from '../lib/prisma';

// Map old sample slugs to new 4ct SKUs
const SAMPLE_SKU_MAP: Record<string, string> = {
  'bliss-berry': 'VD-BB-4',
  'slumber-berry': 'VD-SB-4',
  'berry-chill': 'VD-CC-4',
  'luna-berry': 'VD-LB-4',
};

async function migrate() {
  const stores = await prisma.store.findMany({
    where: {
      availableSamples: {
        isEmpty: false
      }
    },
    select: {
      id: true,
      storeName: true,
      availableSamples: true,
    }
  });
  
  console.log(`Found ${stores.length} stores with samples\n`);
  
  for (const store of stores) {
    const hasOldSKUs = store.availableSamples.some(sku => !sku.startsWith('VD-'));
    
    if (hasOldSKUs) {
      const newSKUs = store.availableSamples.map(oldSKU => {
        const newSKU = SAMPLE_SKU_MAP[oldSKU];
        if (newSKU) {
          console.log(`  ${oldSKU} → ${newSKU}`);
          return newSKU;
        }
        // Keep it if it's already a VD- SKU
        return oldSKU;
      });
      
      console.log(`Updating ${store.storeName}:`, newSKUs);
      
      await prisma.store.update({
        where: { id: store.id },
        data: { availableSamples: newSKUs }
      });
      
      console.log(`✅ Updated\n`);
    }
  }
  
  console.log('Migration complete!');
  await prisma.$disconnect();
}

migrate();
