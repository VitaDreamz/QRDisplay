import prisma from '../lib/prisma';

async function updateBrandEmails() {
  console.log('📧 Updating all brand emails to teamvitadreamz@gmail.com...\n');

  const newEmail = 'teamvitadreamz@gmail.com';

  // Get all brand organizations
  const brands = await prisma.organization.findMany({
    where: { type: 'client' },
    select: {
      id: true,
      orgId: true,
      name: true,
      supportEmail: true,
      emailFromAddress: true,
      emailReplyTo: true,
    },
  });

  console.log(`Found ${brands.length} brands to update:\n`);

  for (const brand of brands) {
    console.log(`🏢 ${brand.name} (${brand.orgId})`);
    console.log(`   Current support: ${brand.supportEmail || 'NOT SET'}`);
    console.log(`   Current from: ${brand.emailFromAddress || 'NOT SET'}`);
    console.log(`   Current reply-to: ${brand.emailReplyTo || 'NOT SET'}`);

    // Update all email fields
    await prisma.organization.update({
      where: { id: brand.id },
      data: {
        supportEmail: newEmail,
        emailFromAddress: newEmail,
        emailReplyTo: newEmail,
      },
    });

    console.log(`   ✅ Updated all emails to: ${newEmail}\n`);
  }

  console.log('✨ All brand emails updated successfully!');
}

updateBrandEmails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error updating brand emails:', error);
    process.exit(1);
  });
