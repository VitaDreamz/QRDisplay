import prisma from "../lib/prisma";
import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("📦 Migrating VitaDreamz products from production to multi-brand architecture...\n");

  // Connect to production database to fetch products
  const prodPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:%3D%3F%3DTosoVDzh3ZZZ%3D%3F%3D@db.sozlzijwzvrmdrocaasg.supabase.co:5432/postgres"
      }
    }
  });

  // Brand mapping with sample product info  
  const brands = {
    "ORG-VSV3I": { 
      name: "VitaDreamz Slumber", 
      skuPrefix: "VD-SB",
      // Individual 4ct sample (not wholesale box)
      sampleProduct: { 
        sku: "VD-SB-4", 
        name: "Slumber Berry - 4ct Sample", 
        description: "CBD + Melatonin & Herbals - Sleep Gummies",
        category: "Sleep",
        price: 0,
        imageUrl: "/images/products/4ct-SlumberBerry-BOXof20.png"
      }
    },
    "ORG-VBEN2": { 
      name: "VitaDreamz Bliss", 
      skuPrefix: "VD-BB",
      sampleProduct: { 
        sku: "VD-BB-4", 
        name: "Bliss Berry - 4ct Sample",
        description: "Magnesium + Herbals - Relax & Sleep Gummies", 
        category: "Relax",
        price: 0,
        imageUrl: "/images/products/4ct-BlissBerry-BOXof20.png"
      }
    },
    "ORG-VC9L4": { 
      name: "VitaDreamz Chill", 
      skuPrefix: "VD-CC",
      sampleProduct: { 
        sku: "VD-CC-4", 
        name: "Berry Chill - 4ct Sample",
        description: "D9 THC + Herbals - ChillOut Chewz",
        category: "ChillOut", 
        price: 0,
        imageUrl: "/images/products/4ct-ChillOutChewz-Bag.png"
      }
    },
  };

  // Get all products from production (excluding Luna Berry)
  const allProducts = await prodPrisma.product.findMany({
    where: {
      orgId: "ORG-VITADREAMZ",
      NOT: {
        sku: { startsWith: "VD-LB" }
      }
    }
  });

  await prodPrisma.$disconnect();

  console.log(`Found ${allProducts.length} products to migrate from production (excluding Luna Berry)\n`);

  // Migrate products to each brand
  for (const [brandOrgId, brandInfo] of Object.entries(brands)) {
    console.log(`\n🏷️  ${brandInfo.name} (${brandOrgId})`);
    console.log("─".repeat(60));

    // Filter products for this brand
    const brandProducts = allProducts.filter((p: any) =>
      p.sku.startsWith(brandInfo.skuPrefix)
    );

    console.log(`   Migrating ${brandProducts.length} products...`);

    let sampleCount = 0;
    let productCount = 0;

    // First, create the individual 4ct sample product (free sample)
    const sampleProd = brandInfo.sampleProduct;
    try {
      await prisma.product.create({
        data: {
          sku: sampleProd.sku,
          name: sampleProd.name,
          description: sampleProd.description,
          category: sampleProd.category,
          price: sampleProd.price,
          orgId: brandOrgId,
          productType: "sample",
          active: true,
          imageUrl: sampleProd.imageUrl,
        },
      });
      sampleCount++;
      console.log(`   ✅ Sample: ${sampleProd.sku} - ${sampleProd.name} (FREE)`);
    } catch (error: any) {
      if (error.code === "P2002") {
        console.log(`   ⚠️  Already exists: ${sampleProd.sku}`);
        sampleCount++;
      } else {
        console.error(`   ❌ Error creating ${sampleProd.sku}:`, error.message);
      }
    }

    // Then migrate products from production
    for (const product of brandProducts) {
      // Determine product type based on SKU
      // -4- or -4ct = sample
      // -BX = wholesale box
      // otherwise = retail
      let productType = "retail";
      if (product.sku.includes("-4-") || product.sku.includes("-4ct")) {
        productType = "sample";
      } else if (product.sku.includes("-BX")) {
        productType = "wholesale-box";
      }

      try {
        await prisma.product.create({
          data: {
            sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.category,
            price: parseFloat(product.price.toString()),
            msrp: product.msrp ? parseFloat(product.msrp.toString()) : null,
            unitsPerBox: product.unitsPerBox,
            wholesalePrice: product.wholesalePrice ? parseFloat(product.wholesalePrice.toString()) : null,
            retailPrice: product.retailPrice ? parseFloat(product.retailPrice.toString()) : null,
            orgId: brandOrgId,
            productType: productType,
            active: product.active ?? true,
            featured: product.featured ?? false,
            shopifyProductId: product.shopifyProductId || null,
            shopifyVariantId: product.shopifyVariantId || null,
            imageUrl: product.imageUrl || null,
          },
        });

        if (productType === "sample") {
          sampleCount++;
          console.log(`   ✅ Sample: ${product.sku} - ${product.name}`);
        } else {
          productCount++;
          console.log(`   ✅ Product: ${product.sku} - ${product.name} (${productType})`);
        }
      } catch (error: any) {
        if (error.code === "P2002") {
          console.log(`   ⚠️  Already exists: ${product.sku}`);
        } else {
          console.error(`   ❌ Error creating ${product.sku}:`, error.message);
        }
      }
    }

    console.log(`\n   📊 Summary: ${sampleCount} samples, ${productCount} full-size products`);
  }

  console.log("\n\n✅ Product migration complete!");
  console.log("\n🔗 Next step: Update brand partnerships with product SKUs");
  console.log("   Run: npx tsx scripts/update-brand-partnerships.ts");
}

main()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
