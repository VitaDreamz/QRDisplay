/**
 * Create the platform organization (QRDisplay/SampleHound)
 * This is the parent org that owns all displays and stores
 */

import prisma from '../lib/prisma';

async function main() {
  console.log('🏢 Creating platform organization...\n');

  // Create the platform org
  const platform = await prisma.organization.create({
    data: {
      orgId: 'ORG-QRDISPLAY',
      name: 'QRDisplay',
      slug: 'qrdisplay',
      type: 'platform',
      supportEmail: 'support@qrdisplay.com',
      websiteUrl: 'https://qrdisplay.com',
    },
  });

  console.log('✅ Platform organization created!\n');
  console.log('📋 Details:');
  console.log(`   Org ID: ${platform.orgId}`);
  console.log(`   Name: ${platform.name}`);
  console.log(`   Type: ${platform.type}`);
  console.log(`\n🎉 Ready to create stores and displays!\n`);
}

main()
  .catch((e) => {
    if (e.code === 'P2002') {
      console.log('✅ Platform organization already exists!');
    } else {
      console.error('❌ Error:', e);
      process.exit(1);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
