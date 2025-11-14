const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteStores() {
  // Delete SID-004 and any other test stores created with broken code
  const storesToDelete = ['SID-004']; // Add more if needed
  
  for (const storeId of storesToDelete) {
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true, storeName: true }
    });
    
    if (store) {
      console.log(`🗑️  Deleting ${storeId} (${store.storeName})...`);
      
      // Delete related records first (cascade should handle this, but being explicit)
      await prisma.storeBrandPartnership.deleteMany({ where: { storeId: store.id } });
      await prisma.storeInventory.deleteMany({ where: { storeId: store.id } });
      await prisma.store.delete({ where: { id: store.id } });
      
      console.log(`   ✅ Deleted ${storeId}`);
    } else {
      console.log(`   ⚠️  ${storeId} not found`);
    }
  }
  
  console.log('\n✅ Done! Create a new store to test the fixes.');
  await prisma.$disconnect();
}

deleteStores();
