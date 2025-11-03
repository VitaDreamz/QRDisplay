import prisma from '../lib/prisma';

async function sellDisplaysToVitaDreamz() {
  try {
    // Get the last 35 displays ordered by creation date
    const displays = await prisma.display.findMany({
      orderBy: { createdAt: 'desc' },
      take: 35,
      select: { displayId: true, status: true }
    });

    console.log(`Found ${displays.length} displays to update`);

    // Update all displays to 'sold' status and assign to VitaDreamz
    const result = await prisma.display.updateMany({
      where: {
        displayId: {
          in: displays.map(d => d.displayId)
        }
      },
      data: {
        status: 'sold',
        assignedOrgId: 'ORG-VITADREAMZ'
      }
    });

    console.log(`✅ Successfully updated ${result.count} displays to 'sold' status`);
    console.log(`✅ Assigned to VitaDreamz (ORG-VITADREAMZ)`);
    
    // List the display IDs
    console.log('\nUpdated displays:');
    displays.forEach(d => {
      console.log(`  - ${d.displayId}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sellDisplaysToVitaDreamz();
