import prisma from '../lib/prisma';

async function setupVitaDreamz() {
  try {
    // Check if VitaDreamz org exists
    let org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' }
    });

    if (!org) {
      // Create VitaDreamz organization
      org = await prisma.organization.create({
        data: {
          orgId: 'ORG-VITADREAMZ',
          name: 'VitaDreamz',
          slug: 'vitadreamz',
          type: 'client'
        }
      });
      console.log('✅ Created VitaDreamz organization');
    } else {
      console.log('✅ VitaDreamz organization already exists');
    }

    // Get the last 35 displays
    const displays = await prisma.display.findMany({
      orderBy: { createdAt: 'desc' },
      take: 35,
      select: { displayId: true, status: true }
    });

    console.log(`\nFound ${displays.length} displays to update`);

    // Update displays
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
    console.log(`✅ Assigned to VitaDreamz`);
    
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

setupVitaDreamz();
