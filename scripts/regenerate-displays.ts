import prisma from '../lib/prisma';

async function regenerateDisplays() {
  console.log('🔄 Regenerating displays with new 6-digit format...');

  // Delete all existing displays
  const deleted = await prisma.display.deleteMany({});
  console.log(`✅ Deleted ${deleted.count} old displays`);

  // Generate 10 new displays with DIS-000001 format
  const displays = [];
  for (let i = 1; i <= 10; i++) {
    const displayId = `DIS-${i.toString().padStart(6, '0')}`;
    displays.push({
      displayId,
      status: 'sold', // Set to 'sold' so they can be activated
      assignedOrgId: 'ORG-LFY8VRIF', // VitaDreamz org
    });
  }

  // Create all displays
  await prisma.display.createMany({
    data: displays,
  });

  console.log('✅ Created 10 new displays:');
  displays.forEach((d) => console.log(`   - ${d.displayId} (status: ${d.status})`));
  console.log('\n✨ Done! You can now test activation with any of these Display IDs.');
}

regenerateDisplays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
