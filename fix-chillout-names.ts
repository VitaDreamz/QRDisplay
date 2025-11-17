import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating ChillOut Chewz product names...\n');
  
  // Update 4ct
  await prisma.product.update({
    where: { sku: 'VD-CC-4' },
    data: { name: '4ct - ChillOut Chewz' }
  });
  console.log('✅ Updated VD-CC-4 to: 4ct - ChillOut Chewz');
  
  // Update 20ct
  await prisma.product.update({
    where: { sku: 'VD-CC-20' },
    data: { name: '20ct - ChillOut Chewz' }
  });
  console.log('✅ Updated VD-CC-20 to: 20ct - ChillOut Chewz');
  
  // Update 60ct
  await prisma.product.update({
    where: { sku: 'VD-CC-60' },
    data: { name: '60ct - ChillOut Chewz' }
  });
  console.log('✅ Updated VD-CC-60 to: 60ct - ChillOut Chewz');
  
  console.log('\n✅ All ChillOut Chewz products updated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
