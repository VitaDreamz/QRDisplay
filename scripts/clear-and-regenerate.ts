import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing stores and resetting displays...');

  // Delete all stores
  const deletedStores = await prisma.store.deleteMany({});
  console.log(`✅ Deleted ${deletedStores.count} stores`);

  // Reset all displays to unactivated state
  const resetDisplays = await prisma.display.updateMany({
    data: {
      storeId: null,
      activatedAt: null,
      activatedBy: null,
    },
  });
  console.log(`✅ Reset ${resetDisplays.count} displays to unactivated state`);

  // Get VitaDreamz organization
  const vitaDreamz = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' },
  });

  if (!vitaDreamz) {
    console.error('❌ VitaDreamz organization not found. Please create it first.');
    return;
  }

  console.log(`\n📦 Generating fresh pack of 10 displays for ${vitaDreamz.name}...`);

  // Get the highest display number to continue from
  const allDisplays = await prisma.display.findMany({
    select: { displayId: true },
    orderBy: { displayId: 'desc' },
  });

  let nextNumber = 1;
  if (allDisplays.length > 0) {
    const lastId = allDisplays[0].displayId;
    const match = lastId.match(/DIS-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Create 10 new displays
  const newDisplays = [];
  for (let i = 0; i < 10; i++) {
    const displayId = `DIS-${(nextNumber + i).toString().padStart(6, '0')}`;
    const display = await prisma.display.create({
      data: {
        displayId,
        status: 'sold',
        assignedOrgId: vitaDreamz.orgId,
        ownerOrgId: 'ORG-QRDISPLAY',
      },
    });
    newDisplays.push(display.displayId);
    console.log(`  ✅ Created ${display.displayId}`);
  }

  console.log(`\n✅ Successfully created ${newDisplays.length} new displays`);
  console.log(`📋 Display IDs: ${newDisplays[0]} through ${newDisplays[newDisplays.length - 1]}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
