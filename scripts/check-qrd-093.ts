import prisma from '../lib/prisma';

async function main() {
  const display = await prisma.display.findUnique({
    where: { displayId: 'QRD-093' },
    include: { store: true }
  });

  if (!display) {
    console.log('Display QRD-093 not found');
    return;
  }

  console.log('\nDisplay QRD-093:');
  console.log(`  Status: ${display.status}`);
  console.log(`  Store ID: ${display.storeId || 'none'}`);
  console.log(`  Activated: ${display.activatedAt || 'not activated'}`);
  
  if (display.store) {
    console.log('\nStore Details:');
    console.log(`  Store ID: ${display.store.storeId}`);
    console.log(`  Name: ${display.store.storeName}`);
    console.log(`  Admin: ${display.store.adminName}`);
    console.log(`  Available Samples: ${JSON.stringify(display.store.availableSamples)}`);
    console.log(`  Created: ${display.store.createdAt}`);
  } else {
    console.log('\nNo store linked to this display');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
