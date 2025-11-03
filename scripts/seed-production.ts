import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Organizations
  const qrdisplay = await prisma.organization.upsert({
    where: { orgId: 'ORG-QRDISPLAY' },
    update: {},
    create: {
      orgId: 'ORG-QRDISPLAY',
      name: 'QRDisplay',
      slug: 'qrdisplay',
      type: 'platform',
      supportEmail: 'jbonutto@gmail.com',
      supportPhone: '+19496836147'
    }
  });

  const vitadreamz = await prisma.organization.upsert({
    where: { orgId: 'ORG-VITADREAMZ' },
    update: {},
    create: {
      orgId: 'ORG-VITADREAMZ',
      name: 'VitaDreamz',
      slug: 'vitadreamz',
      type: 'client',
      supportEmail: 'jimbonutto@vitadreamz.com',
      supportPhone: '+13235361296'
    }
  });

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { userId: 'user_34wdMHN8ogFsfZRPoJUo9jS86lQ' },
    update: {},
    create: {
      userId: 'user_34wdMHN8ogFsfZRPoJUo9jS86lQ',
      email: 'jbonutto@gmail.com',
      name: 'Jim',
      role: 'super-admin',
      orgId: 'ORG-QRDISPLAY'
    }
  });

  console.log('✅ Seeded:', { qrdisplay, vitadreamz, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
