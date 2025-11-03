import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test organizations...');
  
  // Delete all organizations except ORG-QRDISPLAY
  const result = await prisma.organization.deleteMany({
    where: {
      orgId: {
        not: 'ORG-QRDISPLAY'
      }
    }
  });
  
  console.log(`Deleted ${result.count} test organizations`);
  
  // List remaining organizations
  const remaining = await prisma.organization.findMany();
  console.log('\nRemaining organizations:');
  remaining.forEach(org => {
    console.log(`  - ${org.orgId}: ${org.name} (${org.slug})`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
