import prisma from '../lib/prisma';

async function verifyBrandEmails() {
  console.log('📧 Verifying brand email configuration...\n');

  const brands = await prisma.organization.findMany({
    where: { type: 'client' },
    select: {
      orgId: true,
      name: true,
      supportEmail: true,
      emailFromAddress: true,
      emailReplyTo: true,
      shopifyStoreName: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${brands.length} brands:\n`);

  for (const brand of brands) {
    console.log(`🏢 ${brand.name} (${brand.orgId})`);
    console.log(`   Shopify: ${brand.shopifyStoreName || 'Not configured'}`);
    console.log(`   Support Email: ${brand.supportEmail || '❌ NOT SET'}`);
    console.log(`   Email From: ${brand.emailFromAddress || '❌ NOT SET'}`);
    console.log(`   Reply-To: ${brand.emailReplyTo || '❌ NOT SET'}`);
    console.log('');
  }

  // Check if all match expected email
  const allMatch = brands.every(
    (b) =>
      b.supportEmail === 'teamvitadreamz@gmail.com' &&
      b.emailFromAddress === 'teamvitadreamz@gmail.com' &&
      b.emailReplyTo === 'teamvitadreamz@gmail.com'
  );

  if (allMatch) {
    console.log('✅ All brand emails correctly set to teamvitadreamz@gmail.com');
  } else {
    console.log('⚠️  Some emails do not match expected value');
  }
}

verifyBrandEmails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
