import prisma from '../lib/prisma';

async function fixOrgId() {
  // Update the organization's orgId to ORG-VITADREAMZ
  const org = await prisma.organization.updateMany({
    where: { name: 'VitaDreamz' },
    data: { orgId: 'ORG-VITADREAMZ' }
  });
  
  console.log(`✓ Updated ${org.count} organization(s) to orgId: ORG-VITADREAMZ`);
  
  // Update all products to use the new orgId
  const products = await prisma.product.updateMany({
    where: { orgId: 'ORG-86X0W98L' },
    data: { orgId: 'ORG-VITADREAMZ' }
  });
  
  console.log(`✓ Updated ${products.count} product(s) to orgId: ORG-VITADREAMZ`);
  
  // Verify
  const updatedOrg = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  console.log('\n✅ VitaDreamz organization:', updatedOrg?.orgId);
  
  const productCount = await prisma.product.count({
    where: { orgId: 'ORG-VITADREAMZ' }
  });
  
  console.log(`✅ Products with ORG-VITADREAMZ: ${productCount}`);
}

fixOrgId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
