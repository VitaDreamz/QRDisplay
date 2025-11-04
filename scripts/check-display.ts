import prisma from '../lib/prisma';

async function main() {
  const displayId = 'QRD-093'; // Change this to your display ID
  
  const display = await prisma.display.findUnique({
    where: { displayId },
    include: {
      store: true,
    },
  });

  console.log('Display:', JSON.stringify(display, null, 2));
  
  if (display?.storeId) {
    const store = await prisma.store.findUnique({
      where: { storeId: display.storeId },
    });
    console.log('\nStore:', JSON.stringify(store, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
