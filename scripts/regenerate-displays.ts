import prisma from '../lib/prisma';

function generateDisplayId(count: number): string {
  const num = count + 1;
  const padded = String(num).padStart(3, '0'); // Minimum 3 digits (QRD-001)
  return `QRD-${padded}`;
}

async function regenerateDisplays() {
  console.log('🔄 Regenerating 10 displays (QRD-###) and assigning to VitaDreamz...');

  // Resolve VitaDreamz organization
  const vitaDreamz = await prisma.organization.findFirst({
    where: {
      OR: [
        { orgId: 'ORG-VITADREAMZ' },
        { slug: 'vitadreamz' },
        { name: { equals: 'VitaDreamz', mode: 'insensitive' } },
      ],
    },
    select: { orgId: true, name: true },
  });

  if (!vitaDreamz) {
    console.error('❌ VitaDreamz organization not found. Please create it first at /admin/brands/new');
    process.exit(1);
  }

  // Delete all existing displays
  const deleted = await prisma.display.deleteMany({});
  console.log(`✅ Deleted ${deleted.count} old displays`);

  // Get current count (after deletion it's 0, but keep pattern consistent)
  const startCount = await prisma.display.count();

  // Generate 10 new displays with QRD-### format
  const displays = [] as Array<{ displayId: string; status: string; assignedOrgId: string; ownerOrgId: string }>;
  for (let i = 0; i < 10; i++) {
    const displayId = generateDisplayId(startCount + i);
    displays.push({
      displayId,
      status: 'sold', // Set to 'sold' so they can be activated
      assignedOrgId: vitaDreamz.orgId,
      ownerOrgId: 'ORG-QRDISPLAY',
    });
  }

  // Create all displays
  await prisma.display.createMany({
    data: displays,
  });

  console.log(`✅ Created 10 new displays assigned to ${vitaDreamz.name} (${vitaDreamz.orgId}):`);
  displays.forEach((d) => console.log(`   - ${d.displayId} (status: ${d.status})`));
  console.log('\n✨ Done! You can now test activation with any of these Display IDs.');
}

regenerateDisplays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
