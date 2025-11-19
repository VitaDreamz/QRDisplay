import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkShopifyProductSkus() {
  console.log("🔍 Checking Shopify Product SKUs...\n");

  try {
    // Get all VitaDreamz brands
    const brands = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: "VitaDreamz", mode: "insensitive" } },
          { name: { contains: "Vita Dreamz", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        shopifyStoreName: true,
        shopifyAccessToken: true,
      },
    });

    console.log(`Found ${brands.length} VitaDreamz brands:\n`);

    for (const brand of brands) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📦 ${brand.name}`);
      console.log(`Domain: ${brand.shopifyStoreName || "NOT SET"}`);
      console.log(`Token: ${brand.shopifyAccessToken ? "✅ SET" : "❌ MISSING"}`);

      if (!brand.shopifyStoreName || !brand.shopifyAccessToken) {
        console.log("⚠️  Cannot fetch products - missing credentials\n");
        continue;
      }

      try {
        // Fetch products from Shopify
        const response = await fetch(
          `https://${brand.shopifyStoreName}/admin/api/2024-01/products.json?limit=250`,
          {
            headers: {
              "X-Shopify-Access-Token": brand.shopifyAccessToken,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.log(`❌ Error fetching products: ${response.status} ${response.statusText}\n`);
          continue;
        }

        const data = await response.json();
        const products = data.products || [];

        console.log(`\nFound ${products.length} products in Shopify:\n`);

        // Track SKU patterns
        const skuStats = {
          withBX: [] as string[],
          withoutBX: [] as string[],
          noSKU: [] as string[],
        };

        for (const product of products) {
          const variants = product.variants || [];
          
          for (const variant of variants) {
            const sku = variant.sku?.trim();
            
            if (!sku) {
              skuStats.noSKU.push(`${product.title} (Variant: ${variant.title})`);
            } else if (sku.endsWith("-BX")) {
              skuStats.withBX.push(sku);
            } else {
              skuStats.withoutBX.push(sku);
            }
          }
        }

        console.log(`\n📊 SKU Analysis:`);
        console.log(`   Wholesale SKUs (-BX): ${skuStats.withBX.length}`);
        console.log(`   Retail SKUs: ${skuStats.withoutBX.length}`);
        console.log(`   Missing SKUs: ${skuStats.noSKU.length}`);

        if (skuStats.withBX.length > 0) {
          console.log(`\n   ✅ Wholesale SKUs found:`);
          skuStats.withBX.forEach((sku) => console.log(`      - ${sku}`));
        }

        if (skuStats.withoutBX.length > 0) {
          console.log(`\n   📦 Retail SKUs found:`);
          skuStats.withoutBX.forEach((sku) => console.log(`      - ${sku}`));
        }

        if (skuStats.noSKU.length > 0) {
          console.log(`\n   ⚠️  Products missing SKUs:`);
          skuStats.noSKU.forEach((name) => console.log(`      - ${name}`));
        }

        // Check which SKUs exist in our database
        const allSkus = [...skuStats.withBX, ...skuStats.withoutBX];
        
        if (allSkus.length > 0) {
          console.log(`\n\n🔍 Checking which SKUs exist in QRDisplay database...\n`);

          const matchedProducts = await prisma.product.findMany({
            where: {
              sku: { in: allSkus },
            },
            select: {
              sku: true,
              name: true,
              unitsPerBox: true,
              orgId: true,
            },
          });

          const matchedSkus = new Set(matchedProducts.map((p) => p.sku));

          console.log(`   ✅ Matched: ${matchedProducts.length} / ${allSkus.length} SKUs`);

          if (matchedProducts.length > 0) {
            console.log(`\n   Matched products:`);
            matchedProducts.forEach((p) => {
              const boxInfo = p.sku.endsWith("-BX") ? ` (${p.unitsPerBox} units/box)` : "";
              console.log(`      ✓ ${p.sku} - ${p.name}${boxInfo}`);
            });
          }

          const unmatchedSkus = allSkus.filter((sku) => !matchedSkus.has(sku));
          if (unmatchedSkus.length > 0) {
            console.log(`\n   ❌ Unmatched SKUs (in Shopify but not in our system):`);
            unmatchedSkus.forEach((sku) => console.log(`      ✗ ${sku}`));
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching products for ${brand.name}:`, error);
      }
    }

    console.log(`\n\n${"=".repeat(60)}`);
    console.log(`\n💡 RECOMMENDATIONS:\n`);
    console.log(`1. Wholesale products MUST have SKUs ending in -BX`);
    console.log(`2. Wholesale SKU must match a Product in our database`);
    console.log(`3. Retail SKU = Wholesale SKU minus the -BX suffix`);
    console.log(`4. Product.unitsPerBox determines conversion ratio\n`);
    console.log(`Example:`);
    console.log(`  - Shopify: VD-SB-30-BX (wholesale box)`);
    console.log(`  - Database: Product { sku: "VD-SB-30-BX", unitsPerBox: 30 }`);
    console.log(`  - Converts to: VD-SB-30 (retail) x 30 units\n`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShopifyProductSkus();
