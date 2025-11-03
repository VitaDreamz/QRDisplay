import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Generating 10 displays for VitaDreamz...\n');

  // Get VitaDreamz organization
  const vitaDreamz = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' },
  });

  if (!vitaDreamz) {
    console.error('❌ VitaDreamz organization not found.');
    console.log('Please create VitaDreamz brand first at /admin/brands/new');
    return;
  }

  console.log(`✅ Found ${vitaDreamz.name} (${vitaDreamz.orgId})\n`);

  // Get the highest display number to continue from
  const allDisplays = await prisma.display.findMany({
    select: { displayId: true },
    orderBy: { displayId: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (allDisplays.length > 0) {
    const lastId = allDisplays[0].displayId;
    const match = lastId.match(/DIS-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  console.log(`Starting from display number: ${nextNumber}\n`);

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

  console.log(`\n🎉 Successfully created ${newDisplays.length} displays`);
  console.log(`📋 Display IDs: ${newDisplays[0]} through ${newDisplays[newDisplays.length - 1]}`);
  console.log(`\n🧪 Test activation at: http://localhost:3001/activate/${newDisplays[0]}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
