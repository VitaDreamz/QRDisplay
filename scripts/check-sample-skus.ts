import prisma from '../lib/prisma';

async function check() {
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
  
  console.log('Total stores with samples:', stores.length);
  let oldCount = 0;
  
  stores.forEach(s => {
    const hasOldSKUs = s.availableSamples.some(sku => !sku.startsWith('VD-'));
    if (hasOldSKUs) {
      oldCount++;
      console.log(`❌ ${s.storeName}:`, s.availableSamples);
    }
  });
  
  console.log(`\n${oldCount} stores with old SKUs`);
  console.log(`${stores.length - oldCount} stores with new SKUs`);
  
  await prisma.$disconnect();
}

check();
