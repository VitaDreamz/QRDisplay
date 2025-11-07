/**
 * Script to securely connect VitaDreamz organization to Shopify
 * Run with: npx tsx scripts/connect-shopify.ts
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../lib/encryption';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function connectShopify() {
  // VitaDreamz Shopify credentials (loaded from environment)
  const STORE_NAME = process.env.SHOPIFY_STORE_NAME || 'vitadreamz.myshopify.com';
  const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  const API_KEY = process.env.SHOPIFY_API_KEY;
  const API_SECRET = process.env.SHOPIFY_API_SECRET;

  if (!ACCESS_TOKEN || !API_KEY || !API_SECRET) {
    throw new Error('Missing Shopify credentials in environment variables');
  }

  try {
    console.log('🔐 Encrypting credentials...');
    
    // Encrypt sensitive data
    const encryptedAccessToken = encrypt(ACCESS_TOKEN);
    const encryptedApiKey = encrypt(API_KEY);
    const encryptedApiSecret = encrypt(API_SECRET);

    console.log('✅ Credentials encrypted successfully');
    console.log('🔍 Finding VitaDreamz organization...');

    // Find VitaDreamz organization
    const org = await prisma.organization.findUnique({
      where: { orgId: 'ORG-VITADREAMZ' }
    });

    if (!org) {
      console.error('❌ VitaDreamz organization not found!');
      console.log('Available organizations:');
      const allOrgs = await prisma.organization.findMany({
        select: { orgId: true, name: true }
      });
      allOrgs.forEach(o => console.log(`  - ${o.orgId}: ${o.name}`));
      process.exit(1);
    }

    console.log('✅ Found organization:', org.name);
    console.log('💾 Updating Shopify connection...');

    // Update organization with Shopify credentials
    const updated = await prisma.organization.update({
      where: { orgId: 'ORG-VITADREAMZ' },
      data: {
        shopifyStoreName: STORE_NAME,
        shopifyAccessToken: encryptedAccessToken,
        shopifyApiKey: encryptedApiKey,
        shopifyApiSecret: encryptedApiSecret,
        shopifyConnectedAt: new Date(),
        shopifyActive: true,
        commissionRate: 10.0, // 10% commission
        attributionWindow: 30, // 30 days
      },
    });

    console.log('✅ Shopify connected successfully!');
    console.log('\nConfiguration:');
    console.log(`  Store: ${updated.shopifyStoreName}`);
    console.log(`  Commission Rate: ${updated.commissionRate}%`);
    console.log(`  Attribution Window: ${updated.attributionWindow} days`);
    console.log(`  Connected At: ${updated.shopifyConnectedAt?.toISOString()}`);
    console.log(`  Status: ${updated.shopifyActive ? 'Active' : 'Inactive'}`);
    
    console.log('\n🎉 VitaDreamz is now connected to Shopify!');
    
  } catch (error) {
    console.error('❌ Error connecting Shopify:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

connectShopify();
