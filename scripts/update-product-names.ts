import prisma from '../lib/prisma';

async function updateProductNames() {
  console.log('Updating product names and active status...\n');

  const updates = [
    { sku: 'VD-SB-30', name: 'Slumber Berry - 30ct', description: 'CBD + Melatonin & Herbals - Sleep Gummies', active: true },
    { sku: 'VD-SB-60', name: 'Slumber Berry - 60ct', description: 'CBD + Melatonin & Herbals - Sleep Gummies', active: true },
    { sku: 'VD-LB-30', name: 'Luna Berry - 30ct', description: 'Magnesium + Melatonin & Herbals - Sleep Gummies', active: false },
    { sku: 'VD-LB-60', name: 'Luna Berry - 60ct', description: 'Magnesium + Melatonin & Herbals - Sleep Gummies', active: false },
    { sku: 'VD-BB-30', name: 'Bliss Berry - 30ct', description: 'Magnesium + Herbals - Relax & Sleep Gummies', active: true },
    { sku: 'VD-BB-60', name: 'Bliss Berry - 60ct', description: 'Magnesium + Herbals - Relax & Sleep Gummies', active: true },
    { sku: 'VD-CC-20', name: 'Berry Chill - 20ct', description: 'D9 THC + Herbals - ChillOut Chewz', active: true },
    { sku: 'VD-CC-60', name: 'Berry Chill - 60ct', description: 'D9 THC + Herbals - ChillOut Chewz', active: true },
  ];

  for (const update of updates) {
    const result = await prisma.product.update({
      where: { sku: update.sku },
      data: {
        name: update.name,
        description: update.description,
        active: update.active,
      },
    });
    console.log(`✓ Updated ${update.sku}: ${result.name} (active: ${result.active})`);
  }

  console.log('\n✅ All products updated!');
  
  // Show final list
  const products = await prisma.product.findMany({
    where: { orgId: 'ORG-VITADREAMZ' },
    orderBy: [
      { featured: 'desc' },
      { name: 'asc' }
    ]
  });

  console.log('\n📦 VitaDreamz Products (sorted by blend):');
  products.forEach(p => {
    const status = p.active ? '✅' : '❌ (inactive)';
    const featured = p.featured ? '⭐' : '';
    console.log(`  ${p.sku}: ${p.name} - $${p.price} ${featured} ${status}`);
  });
}

updateProductNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
