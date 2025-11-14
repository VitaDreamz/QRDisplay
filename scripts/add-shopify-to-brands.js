require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

function getKey(salt) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512');
}

function encrypt(text) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

async function addShopifyCredentials() {
  const shopifyStoreName = process.env.SHOPIFY_STORE_NAME;
  const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const shopifyApiKey = process.env.SHOPIFY_API_KEY;
  const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;

  if (!shopifyStoreName || !shopifyAccessToken) {
    console.error('❌ Missing Shopify credentials in .env.local');
    console.log('Required: SHOPIFY_STORE_NAME, SHOPIFY_ACCESS_TOKEN');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('🔐 Encrypting Shopify credentials...');
  const encryptedToken = encrypt(shopifyAccessToken);
  const encryptedApiKey = shopifyApiKey ? encrypt(shopifyApiKey) : null;
  const encryptedApiSecret = shopifyApiSecret ? encrypt(shopifyApiSecret) : null;

  console.log('✅ Credentials encrypted');

  const brands = await prisma.organization.findMany({
    where: { orgId: { in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4'] } },
  });

  console.log(`\n📦 Updating ${brands.length} brand organizations...`);

  for (const brand of brands) {
    await prisma.organization.update({
      where: { id: brand.id },
      data: {
        shopifyStoreName,
        shopifyAccessToken: encryptedToken,
        shopifyApiKey: encryptedApiKey,
        shopifyApiSecret: encryptedApiSecret,
        shopifyActive: true,
        shopifyConnectedAt: new Date(),
      },
    });
    console.log(`  ✅ ${brand.name} (${brand.orgId})`);
  }

  console.log(`\n✨ Success! All brands connected to: ${shopifyStoreName}`);
  console.log('🔑 Credentials are encrypted in database');
  
  await prisma.$disconnect();
}

addShopifyCredentials().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
