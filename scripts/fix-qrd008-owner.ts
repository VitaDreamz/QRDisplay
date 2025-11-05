import prisma from '../lib/prisma';

async function fixOwnerOrgId() {
  console.log('Fixing ownerOrgId for QRD-008...\n');

  const display = await prisma.display.update({
    where: { displayId: 'QRD-008' },
    data: { ownerOrgId: 'ORG-VITADREAMZ' }
  });

  console.log('✅ Updated QRD-008:');
  console.log('   ownerOrgId:', display.ownerOrgId);
  console.log('   assignedOrgId:', display.assignedOrgId);
  console.log('   status:', display.status);
}

fixOwnerOrgId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
