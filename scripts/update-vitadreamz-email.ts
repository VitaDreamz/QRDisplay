import prisma from '../lib/prisma';

async function updateVitaDreamzEmail() {
  try {
    // Find VitaDreamz organization
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { orgId: 'ORG-VITADREAMZ' },
          { slug: 'vitadreamz' },
          { name: { contains: 'VitaDreamz', mode: 'insensitive' } }
        ]
      }
    });
    
    if (!org) {
      console.log('❌ VitaDreamz organization not found');
      return;
    }
    
    console.log('✅ Found VitaDreamz org:', org.orgId);
    console.log('  Current supportEmail:', (org as any).supportEmail || 'Not set');
    
    // Update if not set
    if (!(org as any).supportEmail) {
      await prisma.organization.update({
        where: { orgId: org.orgId },
        data: { supportEmail: 'info@vitadreamz.com' }
      });
      console.log('✅ Updated supportEmail to: info@vitadreamz.com');
    } else {
      console.log('✅ supportEmail already set');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVitaDreamzEmail();
