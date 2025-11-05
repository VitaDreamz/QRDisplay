#!/bin/bash
# This script seeds the PRODUCTION database on Railway (the one Vercel uses)

echo "⚠️  WARNING: This will seed the PRODUCTION database!"
echo "Make sure you have the correct DATABASE_URL set in your environment."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo ""
echo "🌱 Seeding production database with VitaDreamz products..."
npx tsx scripts/seed-products.ts

echo ""
echo "🖼️  Updating product images..."
npx tsx scripts/update-product-images.ts

echo ""
echo "✅ Done! Verifying..."
npx tsx scripts/check-products.ts
