import prisma from '../lib/prisma';

async function fixQRD008() {
  const display = await prisma.display.findUnique({ 
    where: { displayId: 'QRD-008' } 
  });
  
  console.log('QRD-008 current state:', {
    displayId: display?.displayId,
    status: display?.status,
    assignedOrgId: display?.assignedOrgId,
    storeId: display?.storeId
  });
  
  if (!display?.assignedOrgId) {
    console.log('\n⚠️  Not assigned to organization. Fixing...');
    await prisma.display.update({
      where: { displayId: 'QRD-008' },
      data: { assignedOrgId: 'ORG-VITADREAMZ' }
    });
    console.log('✅ Assigned to VitaDreamz (ORG-VITADREAMZ)');
  } else {
    console.log('✅ Already assigned to:', display.assignedOrgId);
  }
}

fixQRD008()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
