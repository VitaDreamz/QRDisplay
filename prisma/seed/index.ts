import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Create QRDisplay organization (platform/super-admin)
  const qrDisplay = await prisma.organization.create({
    data: {
      orgId: 'ORG-QRDISPLAY',
      name: 'QR Display',
      slug: 'qrdisplay',
      type: 'platform',
    },
  });
  console.log('✅ Created QRDisplay organization');

  // 2. Create super-admin user
  const adminUser = await prisma.user.create({
    data: {
      userId: 'USR-ADMIN-01',
      email: 'jbonutto@gmail.com',
      name: 'James Bonutto',
      role: 'super-admin',
      orgId: qrDisplay.orgId,
    },
  });
  console.log('✅ Created super-admin user');

  // 3. Create VitaDreamz organization (client)
  const vitaDreamz = await prisma.organization.create({
    data: {
      orgId: 'ORG-VDZ',
      name: 'VitaDreamz',
      slug: 'vitadreamz',
      type: 'client',
    },
  });
  console.log('✅ Created VitaDreamz organization');

  // 4. Create 10 sample displays
  const displays = await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const num = String(i + 1).padStart(4, '0');
      return prisma.display.create({
        data: {
          displayId: `DIS-${num}`,
          ownerOrgId: qrDisplay.orgId,
          status: 'inventory',
          shortlink: `d${num}`,
          targetUrl: `https://qrdisplay.co/d/${num}`,
          qrPngUrl: `https://qrdisplay.co/qr/d${num}.png`,
        },
      });
    })
  );
  console.log('✅ Created 10 sample displays');

  // Log summary
  console.log('\n🎉 Seed completed successfully!');
  console.log(`Organizations created: ${[qrDisplay.name, vitaDreamz.name].join(', ')}`);
  console.log(`Users created: ${adminUser.email} (${adminUser.role})`);
  console.log(`Displays created: ${displays.length}`);
}

// Run the seed
seed()
  .catch((error) => {
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });