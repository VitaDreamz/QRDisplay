import prisma from '../lib/prisma';

async function main() {
  console.log('🗑️  Deleting all SHD displays...\n');

  // Find all SHD displays
  const shdDisplays = await prisma.display.findMany({
    where: {
      displayId: {
        startsWith: 'SHD-'
      }
    }
  });

  console.log(`Found ${shdDisplays.length} SHD displays to delete\n`);

  if (shdDisplays.length === 0) {
    console.log('✅ No SHD displays found');
    return;
  }

  // Delete them
  const result = await prisma.display.deleteMany({
    where: {
      displayId: {
        startsWith: 'SHD-'
      }
    }
  });

  console.log(`✅ Deleted ${result.count} SHD displays`);
  console.log('\nDeleted display IDs:');
  shdDisplays.forEach(d => console.log(`  - ${d.displayId}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
