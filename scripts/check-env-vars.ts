/**
 * Check which environment variables from .env.local are missing in Vercel
 * 
 * Usage: Run this locally, then manually check Vercel dashboard
 */

import fs from 'fs';
import path from 'path';

const envLocalPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const lines = envContent.split('\n');

const localVars: Record<string, string> = {};
const comments: string[] = [];

console.log('\n📋 Environment Variables in .env.local:\n');

for (const line of lines) {
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) continue;
  
  // Track comments
  if (trimmed.startsWith('#')) {
    comments.push(trimmed);
    continue;
  }
  
  // Parse KEY=VALUE
  const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (match) {
    const [, key, value] = match;
    localVars[key] = value;
    
    // Check if it exists in current process.env (loaded from .env.local)
    const existsInProcess = process.env[key] !== undefined;
    const status = existsInProcess ? '✅' : '⚠️';
    
    // Mask sensitive values
    let displayValue = value;
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD')) {
      if (value.length > 10) {
        displayValue = value.substring(0, 8) + '...' + value.substring(value.length - 4);
      } else {
        displayValue = '***';
      }
    }
    
    console.log(`${status} ${key}=${displayValue}`);
  }
}

console.log('\n\n🚀 Required for Vercel Production:\n');
console.log('Copy these to Vercel Environment Variables:');
console.log('(Vercel Dashboard → Project Settings → Environment Variables)\n');

const criticalVars = [
  'DATABASE_URL',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_APP_URL',
  'RESEND_API_KEY',
  'SHOPIFY_ADMIN_API_KEY',
  'SHOPIFY_ADMIN_API_SECRET',
  'SHOPIFY_STORE_DOMAIN',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
];

criticalVars.forEach(key => {
  const value = localVars[key];
  if (value) {
    console.log(`✅ ${key}=${value}`);
  } else {
    console.log(`❌ ${key}=MISSING`);
  }
});

console.log('\n\n⚠️  IMPORTANT: Make sure to add these in Vercel with the same values!');
console.log('After adding, redeploy your app for changes to take effect.\n');
