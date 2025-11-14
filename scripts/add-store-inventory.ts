import prisma from "../lib/prisma";

async function main() {
  console.log("📦 Adding inventory to store from brand partnerships...\n");

  const store = await prisma.store.findUnique({
    where: { storeId: "SID-001" },
    include: {
      brandPartnerships: {
        where: { active: true },
        include: { brand: true }
      }
    }
  });

  if (!store) {
    throw new Error("Store not found!");
  }

  console.log(`Store: ${store.storeName}`);
  console.log(`Brand partnerships: ${store.brandPartnerships.length}\n`);

  // Add inventory for each brand's products
  for (const partnership of store.brandPartnerships) {
    console.log(`\n🏷️  ${partnership.brand.name}`);
    console.log("─".repeat(60));

    const allSkus = [
      ...partnership.availableSamples,
      ...partnership.availableProducts
    ];

    console.log(`   Adding inventory for ${allSkus.length} products...`);

    for (const sku of allSkus) {
      const product = await prisma.product.findUnique({
        where: { sku },
        select: { sku: true, name: true, productType: true }
      });

      if (!product) {
        console.log(`   ⚠️  Product not found: ${sku}`);
        continue;
      }

      // Check if inventory already exists
      const existing = await prisma.storeInventory.findFirst({
        where: {
          storeId: store.id,
          productSku: product.sku
        }
      });

      if (existing) {
        console.log(`   ⏭️  Already has inventory: ${sku}`);
        continue;
      }

      // Add inventory
      const quantity = product.productType === "sample" ? 100 : 50;
      
      await prisma.storeInventory.create({
        data: {
          storeId: store.id,
          productSku: product.sku,
          quantityOnHand: quantity,
          quantityReserved: 0,
          quantityAvailable: quantity
        }
      });

      console.log(`   ✅ ${sku} - ${product.name} (qty: ${quantity})`);
    }
  }

  console.log("\n\n✅ Inventory added successfully!");
  console.log("\n📊 Summary:");
  
  const totalInventory = await prisma.storeInventory.count({
    where: { storeId: store.id }
  });
  
  console.log(`   Total products in inventory: ${totalInventory}`);
  console.log("\n🔗 View in dashboard: http://localhost:3001/store/dashboard");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
