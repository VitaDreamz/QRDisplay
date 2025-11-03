import prisma from '../lib/prisma';

// Usage: npx tsx scripts/assign-displays.ts <orgId> <startNumber> <endNumber>
// Example: npx tsx scripts/assign-displays.ts ORG-RPZ11DSB 1 10

async function assignDisplays() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.log('❌ Usage: npx tsx scripts/assign-displays.ts <orgId> <startNumber> <endNumber>');
    console.log('   Example: npx tsx scripts/assign-displays.ts ORG-RPZ11DSB 1 10');
    process.exit(1);
  }

  const [orgId, startStr, endStr] = args;
  const start = parseInt(startStr);
  const end = parseInt(endStr);

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { orgId },
  });

  if (!org) {
    console.log(`❌ Organization ${orgId} not found`);
    process.exit(1);
  }

  console.log(`📦 Assigning displays to ${org.name} (${orgId})...\n`);

  // Update displays
  for (let i = start; i <= end; i++) {
    const displayId = `DIS-${i.toString().padStart(6, '0')}`;
    
    try {
      const display = await prisma.display.update({
        where: { displayId },
        data: {
          assignedOrgId: orgId,
          status: 'sold', // Mark as sold when assigning
        },
      });
      console.log(`✅ ${displayId} assigned to ${org.name}`);
    } catch (error) {
      console.log(`⚠️  ${displayId} not found, creating new...`);
      await prisma.display.create({
        data: {
          displayId,
          assignedOrgId: orgId,
          status: 'sold',
        },
      });
      console.log(`✅ ${displayId} created and assigned to ${org.name}`);
    }
  }

  console.log(`\n✅ Done! Assigned ${end - start + 1} displays to ${org.name}`);
}

assignDisplays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
