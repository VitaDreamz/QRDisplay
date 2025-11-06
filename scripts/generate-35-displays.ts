import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Generating 35 displays for VitaDreamz...\n');

  // First, ensure VitaDreamz organization exists
  let vitaDreamz = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' },
  });

  if (!vitaDreamz) {
    console.log('⚠️  VitaDreamz organization not found. Creating it...\n');
    vitaDreamz = await prisma.organization.create({
      data: {
        orgId: 'ORG-VITADREAMZ',
        name: 'VitaDreamz',
        slug: 'vitadreamz',
        type: 'brand',
      },
    });
    console.log(`✅ Created ${vitaDreamz.name} (${vitaDreamz.orgId})\n`);
  } else {
    console.log(`✅ Found ${vitaDreamz.name} (${vitaDreamz.orgId})\n`);
  }

  // Ensure QRDisplay organization exists (owner)
  let qrDisplay = await prisma.organization.findFirst({
    where: { orgId: 'ORG-QRDISPLAY' },
  });

  if (!qrDisplay) {
    console.log('⚠️  QRDisplay organization not found. Creating it...\n');
    qrDisplay = await prisma.organization.create({
      data: {
        orgId: 'ORG-QRDISPLAY',
        name: 'QRDisplay',
        slug: 'qrdisplay',
        type: 'platform',
      },
    });
    console.log(`✅ Created ${qrDisplay.name} (${qrDisplay.orgId})\n`);
  }

  // Get the highest display number to continue from
  const allDisplays = await prisma.display.findMany({
    select: { displayId: true },
    orderBy: { displayId: 'desc' },
  });

  let nextNumber = 1;
  if (allDisplays.length > 0) {
    // Find the highest QRD number
    const qrdDisplays = allDisplays.filter(d => d.displayId.startsWith('QRD-'));
    if (qrdDisplays.length > 0) {
      const lastId = qrdDisplays[0].displayId;
      const match = lastId.match(/QRD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
  }

  console.log(`Starting from display number: ${nextNumber}\n`);

  // Create 35 new displays
  const newDisplays = [];
  for (let i = 0; i < 35; i++) {
    const displayId = `QRD-${(nextNumber + i).toString().padStart(3, '0')}`;
    const display = await prisma.display.create({
      data: {
        displayId,
        status: 'sold',
        assignedOrgId: vitaDreamz.orgId,
        ownerOrgId: qrDisplay.orgId,
      },
    });

    newDisplays.push(display);
    console.log(`✅ Created ${displayId} (sold to VitaDreamz)`);
  }

  console.log(`\n🎉 Successfully created ${newDisplays.length} displays!`);
  console.log('\nDisplay IDs:');
  newDisplays.forEach(d => console.log(`  - ${d.displayId}`));
  console.log('\nThese displays can now be activated by visiting:');
  console.log(`http://localhost:3001/activate/[displayId]`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
