import prisma from '../lib/prisma';

(async () => {
  // Check for SID-019 store
  const store = await prisma.store.findFirst({
    where: { storeId: 'SID-019' },
    select: { id: true, storeId: true, storeName: true }
  });
  
  if (!store) {
    console.log('Store SID-019 not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Store found:', store.storeId, '-', store.storeName);
  console.log('Store DB ID:', store.id);
  
  // Check inventory for this store
  const inventory = await prisma.storeInventory.findMany({
    where: { storeId: store.id },
    select: {
      productSku: true,
      quantityOnHand: true,
      quantityAvailable: true,
      updatedAt: true
    }
  });
  
  console.log('\nInventory records:', inventory.length);
  if (inventory.length > 0) {
    inventory.forEach(inv => {
      console.log(`  ${inv.productSku}: ${inv.quantityOnHand} on hand, ${inv.quantityAvailable} available (updated: ${inv.updatedAt})`);
    });
  } else {
    console.log('  No inventory records found for this store');
  }
  
  // Check inventory transactions
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { storeId: store.id },
    select: {
      productSku: true,
      type: true,
      quantity: true,
      createdAt: true,
      notes: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\nInventory transactions:', transactions.length);
  if (transactions.length > 0) {
    transactions.forEach(tx => {
      console.log(`  ${tx.productSku}: ${tx.type} (${tx.quantity} units) - ${tx.createdAt}`);
      if (tx.notes) console.log(`    Notes: ${tx.notes}`);
    });
  } else {
    console.log('  No inventory transactions found');
  }
  
  await prisma.$disconnect();
})();
