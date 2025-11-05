import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Copy bag images to products folder for samples
  const { execSync } = require('child_process');
  
  console.log('📸 Copying sample bag images...\n');
  
  execSync(`
    cd public/images && \
    cp "displays/4ct-SlumberBerry-Bag.png" "products/slumber-berry-sample.jpg" && \
    cp "displays/4ct-BlissBerry-Bag.png" "products/bliss-berry-sample.jpg" && \
    cp "displays/20ct-ChillOut Chewz-Bag.png" "products/berry-chill-sample.jpg"
  `);
  
  console.log('✅ Images copied\n');

  // Update sample product images in database
  const updates = [
    { sku: 'VD-SB-SAMPLE', imageUrl: '/images/products/slumber-berry-sample.jpg' },
    { sku: 'VD-BB-SAMPLE', imageUrl: '/images/products/bliss-berry-sample.jpg' },
    { sku: 'VD-CC-SAMPLE', imageUrl: '/images/products/berry-chill-sample.jpg' },
  ];

  console.log('📝 Updating sample product images in database...\n');

  for (const update of updates) {
    try {
      const result = await prisma.product.update({
        where: { sku: update.sku },
        data: { imageUrl: update.imageUrl },
      });
      console.log(`✅ Updated ${result.sku}: ${result.name}`);
    } catch (e) {
      console.log(`⚠️  ${update.sku} not found, skipping`);
    }
  }

  console.log('\n✨ Sample images updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
