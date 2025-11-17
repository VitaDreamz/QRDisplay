import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres'
    }
  }
});

async function main() {
  const org = await prisma.organization.findUnique({
    where: { orgId: 'ORG-QRDISPLAY' },
    select: {
      id: true,
      orgId: true,
      name: true,
      type: true,
    }
  });
  
  if (org) {
    console.log('✅ ORG-QRDISPLAY exists:');
    console.log(org);
  } else {
    console.log('❌ ORG-QRDISPLAY does NOT exist - needs to be created!');
    
    console.log('\nCreating ORG-QRDISPLAY...');
    const created = await prisma.organization.create({
      data: {
        orgId: 'ORG-QRDISPLAY',
        name: 'QRDisplay Platform',
        slug: 'qrdisplay-platform',
        type: 'platform',
      }
    });
    console.log('✅ Created:', created);
  }
}

main().finally(() => prisma.$disconnect());
