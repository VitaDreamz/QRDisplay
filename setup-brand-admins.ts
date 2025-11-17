import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:QRD1splay16359@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres'
    }
  }
});

async function main() {
  const email = 'jimbonutto@vitadreamz.com';
  const phone = '+19496836147';
  const name = 'Jim Bonutto';
  
  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, userId: true, email: true, phone: true, name: true, orgId: true, role: true }
  });
  
  if (user) {
    console.log(`✓ User already exists: ${user.userId}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  OrgId: ${user.orgId}`);
    console.log(`  Role: ${user.role}\n`);
    
    // Update phone/name if needed
    if (user.phone !== phone || user.name !== name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone, name }
      });
      console.log('→ Updated phone and name\n');
    }
  } else {
    // Create new user for ORG-QRDISPLAY (platform admin)
    user = await prisma.user.create({
      data: {
        userId: 'USR-QRDISPLAY-ADMIN',
        email,
        phone,
        name,
        orgId: 'ORG-QRDISPLAY',
        role: 'org-admin',
      }
    });
    console.log(`✅ Created platform admin user: ${user.userId}\n`);
  }
  
  console.log('✨ Brand admin set up!');
}

main().finally(() => prisma.$disconnect());
