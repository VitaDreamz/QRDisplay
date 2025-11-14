import prisma from "../lib/prisma";

async function main() {
  const storeId = "SID-001";
  const adminPin = "1234";

  await prisma.store.update({
    where: { storeId },
    data: { staffPin: adminPin }
  });

  console.log("✅ Admin PIN set successfully!\n");
  console.log("📍 Store Admin Login:");
  console.log("   URL: http://localhost:3001/store/login");
  console.log("   Store ID: SID-001");
  console.log("   Admin PIN: 1234");
  console.log("\n💡 This is the owner/admin PIN for the store dashboard.");
  console.log("   (Staff have separate PINs for the staff dashboard)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
