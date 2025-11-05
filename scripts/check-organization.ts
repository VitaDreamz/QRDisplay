import prisma from '../lib/prisma';

async function checkOrganization() {
  const org = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  console.log('VitaDreamz organization:', org);
}

checkOrganization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
