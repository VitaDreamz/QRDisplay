import prisma from '../lib/prisma';

async function backfillSamples() {
  console.log('Backfilling existing stores with all sample options...');
  
  const result = await prisma.store.updateMany({
    where: {},
    data: {
      availableSamples: ['slumber-berry', 'luna-berry', 'bliss-berry', 'berry-chill']
    }
  });
  
  console.log(`✅ Updated ${result.count} stores with default sample options`);
}

backfillSamples()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
