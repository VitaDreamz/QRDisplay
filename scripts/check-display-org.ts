import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDisplay() {
  const displayId = process.argv[2] || 'QRD-047';
  
  const display = await prisma.display.findUnique({
    where: { displayId },
    select: {
      displayId: true,
      status: true,
      assignedOrgId: true,
      ownerOrgId: true,
      storeId: true,
    }
  });
  
  if (!display) {
    console.log(`❌ Display ${displayId} not found`);
  } else {
    console.log(`\n📺 Display: ${display.displayId}`);
    console.log(`   Status: ${display.status}`);
    console.log(`   Owner Org: ${display.ownerOrgId}`);
    console.log(`   Assigned Org: ${display.assignedOrgId || '(not assigned)'}`);
    console.log(`   Store: ${display.storeId || '(not assigned)'}`);
    
    if (!display.assignedOrgId) {
      console.log(`\n⚠️  This display has no assignedOrgId!`);
      console.log(`   Run: UPDATE displays SET "assignedOrgId" = 'ORG-VITADREAMZ' WHERE "displayId" = '${displayId}';`);
    }
  }
  
  await prisma.$disconnect();
}

checkDisplay().catch(console.error);
