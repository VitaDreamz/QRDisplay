import prisma from '../lib/prisma';
import { nanoid } from 'nanoid';

async function setupTestData() {
  console.log('🎬 Setting up test data with new structure...\n');

  // 1. Create a test brand (VitaDreamz)
  console.log('📦 Creating VitaDreamz brand...');
  const brandOrgId = `ORG-${nanoid(8)}`.toUpperCase();
  
  const brand = await prisma.organization.create({
    data: {
      orgId: brandOrgId,
      name: 'VitaDreamz',
      slug: 'vitadreamz',
      type: 'client',
      supportEmail: 'info@vitadreamz.com',
      supportPhone: '+13235361296',
      emailFromName: 'VitaDreamz',
      emailFromAddress: 'noreply@vitadreamz.com',
      emailReplyTo: 'info@vitadreamz.com',
      websiteUrl: 'https://vitadreamz.com',
    },
  });

  // 2. Create brand owner user
  console.log('👤 Creating brand owner account...');
  await prisma.user.create({
    data: {
      userId: `USER-${nanoid(12)}`,
      email: 'jim@vitadreamz.com',
      name: 'Jim Bonutto',
      phone: '+19496836147',
      role: 'org-admin',
      orgId: brand.orgId,
    },
  });

  // 3. Create 10 displays (sold status, assigned to VitaDreamz)
  console.log('📱 Creating 10 displays assigned to VitaDreamz...');
  const displays = [];
  for (let i = 1; i <= 10; i++) {
    const displayId = `DIS-${i.toString().padStart(6, '0')}`;
    displays.push({
      displayId,
      status: 'sold',
      assignedOrgId: brand.orgId,
    });
  }

  await prisma.display.createMany({
    data: displays,
  });

  console.log('\n✅ Test data created!\n');
  console.log('📋 What was created:');
  console.log(`   Brand: ${brand.name} (${brand.orgId})`);
  console.log(`   Owner: Jim Bonutto <jim@vitadreamz.com> +1 (949) 683-6147`);
  console.log(`   Support: ${brand.supportEmail} ${brand.supportPhone}`);
  console.log('   Displays: DIS-000001 through DIS-000010 (all sold, assigned to VitaDreamz)');
  console.log('\n🎯 Next steps:');
  console.log('   1. Go to http://localhost:3001/activate/DIS-000001');
  console.log('   2. Fill out the activation form');
  console.log('   3. Check for TWO SMS messages:');
  console.log('      - One to the store manager (form phone)');
  console.log('      - One to Jim Bonutto (+1 949-683-6147)');
  console.log('   4. Verify branded success page shows "VitaDreamz"\n');
}

setupTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
