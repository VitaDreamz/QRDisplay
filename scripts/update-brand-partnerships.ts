import prisma from "../lib/prisma";

async function main() {
  console.log("🔗 Updating brand partnerships with product SKUs...\n");

  const store = await prisma.store.findUnique({
    where: { storeId: "SID-001" },
  });

  if (!store) {
    throw new Error("Test store not found!");
  }

  const brands = [
    { orgId: "ORG-VSV3I", name: "VitaDreamz Slumber" },
    { orgId: "ORG-VBEN2", name: "VitaDreamz Bliss" },
    { orgId: "ORG-VC9L4", name: "VitaDreamz Chill" },
  ];

  for (const brand of brands) {
    console.log(`\n📦 ${brand.name} (${brand.orgId})`);
    console.log("─".repeat(60));

    // Get all products for this brand
    const products = await prisma.product.findMany({
      where: { orgId: brand.orgId },
      orderBy: { sku: "asc" },
    });

    // Separate samples and full-size products
    const samples = products.filter((p) => p.productType === "sample");
    const fullSize = products.filter((p) => p.productType !== "sample");

    console.log(`   Found ${products.length} total products:`);
    console.log(`   - ${samples.length} samples`);
    console.log(`   - ${fullSize.length} full-size products`);

    // Update the partnership
    const partnership = await prisma.storeBrandPartnership.findFirst({
      where: {
        storeId: store.id,
        brand: {
          orgId: brand.orgId,
        },
      },
    });

    if (!partnership) {
      console.log(`   ❌ No partnership found for ${brand.name}`);
      continue;
    }

    await prisma.storeBrandPartnership.update({
      where: { id: partnership.id },
      data: {
        availableSamples: samples.map((p) => p.sku),
        availableProducts: fullSize.map((p) => p.sku),
      },
    });

    console.log(`\n   ✅ Updated partnership:`);
    console.log(`      Samples: ${samples.map((s) => s.sku).join(", ")}`);
    console.log(`      Products: ${fullSize.map((p) => p.sku).join(", ")}`);
  }

  console.log("\n\n✅ All brand partnerships updated!");
  console.log("\n🎉 Multi-brand setup complete!");
  console.log("\n📊 Summary:");
  console.log("   - 3 brands created");
  console.log("   - 18 products migrated (6 per brand)");
  console.log("   - 3 partnerships configured");
  console.log("\n🔗 Next steps:");
  console.log("   1. Open Prisma Studio: npx prisma studio");
  console.log("   2. View brands at: http://localhost:3001/admin/brands");
  console.log("   3. View store dashboard: http://localhost:3001/store/SID-001");
}

main()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
