import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// POST /api/admin/stores/create
// Create a new store with brand partnerships and products pre-configured
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      streetAddress,
      city,
      state,
      zipCode,
      timezone,
      ownerName,
      ownerPhone,
      ownerEmail,
      staffPin,
      subscriptionTier,
      brandPartnerships,
      inventoryQuantities,
      staffMembers,
    } = body;

    // Validation
    if (!businessName || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, city, state' },
        { status: 400 }
      );
    }

    if (!brandPartnerships || brandPartnerships.length === 0) {
      return NextResponse.json(
        { error: 'At least one brand partnership is required' },
        { status: 400 }
      );
    }
    
    // Validate staff PIN (if provided, must be 4 digits)
    const finalStaffPin = staffPin || Math.floor(1000 + Math.random() * 9000).toString();
    if (!/^\d{4}$/.test(finalStaffPin)) {
      return NextResponse.json(
        { error: 'Staff PIN must be a 4-digit number' },
        { status: 400 }
      );
    }

    // Generate sequential store ID
    const lastStore = await prisma.store.findFirst({
      where: { storeId: { startsWith: 'SID-' } },
      orderBy: { createdAt: 'desc' },
    });
    
    let nextNum = 1;
    if (lastStore?.storeId) {
      const match = lastStore.storeId.match(/SID-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    
    const storeId = `SID-${nextNum.toString().padStart(3, '0')}`;

    // Find or create the QRDisplay platform organization
    let platformOrg = await prisma.organization.findFirst({
      where: { orgId: 'ORG-QRDISPLAY' },
    });

    if (!platformOrg) {
      // Create the QRDisplay platform organization if it doesn't exist
      platformOrg = await prisma.organization.create({
        data: {
          orgId: 'ORG-QRDISPLAY',
          slug: 'qrdisplay',
          name: 'QRDisplay',
          type: 'platform',
        },
      });
      console.log('Created QRDisplay platform organization:', platformOrg.id);
    }

    // Get subscription tier configuration
    const { getTierConfig } = await import('@/lib/subscription-tiers');
    const tierConfig = getTierConfig(subscriptionTier || 'free');

    // Create the store
    const store = await prisma.store.create({
      data: {
        storeId,
        storeName: businessName,
        streetAddress: streetAddress || '',
        city,
        state,
        zipCode: zipCode || '',
        timezone: timezone || 'America/New_York',
        ownerName: ownerName || '',
        ownerPhone: ownerPhone || '',
        ownerEmail: ownerEmail || '',
        staffPin: finalStaffPin,
        status: 'active',
        orgId: 'ORG-QRDISPLAY', // Assign to QRDisplay platform (references Organization.orgId)
        promoOffer: '20% off first purchase',
        returningCustomerPromo: '10% off',
        
        // Subscription tier and benefits
        subscriptionTier: tierConfig.id,
        subscriptionStatus: 'active',
        customerSlotsGranted: tierConfig.features.newCustomersPerBilling,
        samplesPerQuarter: tierConfig.features.samplesPerQuarter,
        commissionRate: tierConfig.features.commissionRate,
        promoReimbursementRate: tierConfig.features.promoReimbursementRate,
      },
    });

    console.log('🏪 Creating store:', storeId);
    console.log('📦 Brand partnerships received:', JSON.stringify(brandPartnerships, null, 2));
    console.log('📊 Inventory quantities received:', JSON.stringify(inventoryQuantities, null, 2));

    // Create brand partnerships
    const allSkusSet = new Set<string>(); // Collect all unique SKUs across all partnerships
    
    for (const partnership of brandPartnerships) {
      const { brandId, availableSamples, availableProducts } = partnership;
      
      console.log(`  Creating partnership for brand ${brandId}:`, {
        samples: availableSamples,
        products: availableProducts
      });

      // Look up the Organization internal ID from the orgId string
      const brandOrg = await prisma.organization.findUnique({
        where: { orgId: brandId }, // brandId from frontend is actually orgId (e.g., "ORG-VSV3I")
        select: { id: true }
      });

      if (!brandOrg) {
        console.error(`❌ Brand organization not found: ${brandId}`);
        continue;
      }

      await prisma.storeBrandPartnership.create({
        data: {
          storeId: store.id,
          brandId: brandOrg.id, // Use the internal database ID
          availableSamples: availableSamples || [],
          availableProducts: availableProducts || [],
          status: 'active',
          onlineCommission: 20.0,
          subscriptionCommission: 5.0,
          promoCommission: 50.0,
          storeCreditBalance: 0,
        },
      });

      // Collect SKUs for inventory creation (done after all partnerships)
      [...(availableSamples || []), ...(availableProducts || [])].forEach(sku => allSkusSet.add(sku));
    }

    // Create inventory records for all unique SKUs (after all partnerships created)
    console.log(`📦 Creating inventory for ${allSkusSet.size} unique SKUs...`);
    const allSampleSkus: string[] = [];
    const allProductSkus: string[] = [];
    
    for (const sku of allSkusSet) {
      const quantity = inventoryQuantities?.[sku] || 0;
      console.log(`  - ${sku}: ${quantity} units`);
      
      await prisma.storeInventory.create({
        data: {
          storeId: store.id,
          productSku: sku,
          quantityOnHand: quantity,
        },
      });

      // Categorize SKUs for default offering
      if (sku.endsWith('-4')) {
        allSampleSkus.push(sku);
      } else if (!sku.endsWith('-BX')) {
        allProductSkus.push(sku);
      }
    }

    // Update store to offer all samples and products by default
    await prisma.store.update({
      where: { id: store.id },
      data: {
        availableSamples: allSampleSkus,
        availableProducts: allProductSkus,
      },
    });
    console.log(`✅ Default offerings set: ${allSampleSkus.length} samples, ${allProductSkus.length} products`);

    // Sync store to brand Shopify accounts as wholesale customer
    if (brandPartnerships && brandPartnerships.length > 0) {
      console.log(`🔗 Syncing store to ${brandPartnerships.length} brand Shopify accounts...`);
      const { syncStoreToMultipleBrands } = await import('@/lib/shopify-wholesale-sync');
      
      try {
        const syncResults = await syncStoreToMultipleBrands(
          store.storeId,
          brandPartnerships.map((bp: { brandId: string }) => bp.brandId)
        );
        
        const successful = syncResults.filter((r: { success: boolean }) => r.success).length;
        console.log(`✅ Synced to ${successful}/${brandPartnerships.length} brand Shopify accounts`);
        
        syncResults.forEach(result => {
          if (result.success && !result.skipped) {
            console.log(`  ✓ ${result.brandOrgId}: Customer ${result.shopifyCustomerId} (${result.isNew ? 'created' : 'updated'})`);
          } else if (result.skipped) {
            console.log(`  ⊘ ${result.brandOrgId}: ${result.reason}`);
          } else {
            console.log(`  ✗ ${result.brandOrgId}: ${result.error}`);
          }
        });
      } catch (error) {
        console.error('Error syncing to Shopify (non-blocking):', error);
        // Don't fail store creation if Shopify sync fails
      }
    }

    // Create staff members if provided
    if (staffMembers && staffMembers.length > 0) {
      for (const staff of staffMembers) {
        const cleanPhone = staff.phone.replace(/\D/g, '');
        const staffPin = cleanPhone.slice(-4); // Last 4 digits of phone
        const staffId = `STF-${crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3)}`;
        const verificationToken = crypto.randomBytes(16).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const newStaff = await prisma.staff.create({
          data: {
            storeId: store.id,
            staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
            phone: cleanPhone,
            email: staff.email,
            staffPin,
            type: staff.role,
            onCallDays: staff.onCallDays || [],
            onCallHoursStart: staff.startTime || '09:00',
            onCallHoursStop: staff.endTime || '17:00',
            verified: false,
            verificationToken,
            verificationExpiry,
            status: 'pending',
          },
        });

        // Send verification SMS/Email (best-effort)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
        const verifyUrl = `${baseUrl}/staff/verify/${verificationToken}`;
        const loginUrl = `${baseUrl}/store/login/${storeId}`;

        // SMS via Twilio (if configured)
        if (cleanPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
          try {
            const twilio = require('twilio');
            const client = twilio(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            );
            const text = `Welcome to ${businessName}!\n\nYou've been added as a staff member.\n\nVerify your account:\n${verifyUrl}\n\nYour PIN is the last 4 digits of your phone: ${staffPin}\n\nYou'll use this PIN to login at: ${loginUrl}`;
            await client.messages.create({
              to: `+1${cleanPhone}`,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: text
            });
            console.log('✅ Staff verification SMS sent to:', cleanPhone);
          } catch (smsErr) {
            console.warn('SMS send failed (staff welcome):', smsErr);
          }
        }

        // Email via Resend (if configured)
        if (staff.email && process.env.RESEND_API_KEY) {
          try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'QRDisplay <noreply@qrdisplay.com>',
              to: staff.email,
              subject: `Verify your staff account for ${businessName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #7c3aed;">Welcome to ${businessName}</h1>
                  <p>You have been added as a staff member.</p>
                  <p><strong>Step 1:</strong> Verify your account within 24 hours:<br/>
                    <a href="${verifyUrl}">${verifyUrl}</a>
                  </p>
                  <p><strong>Step 2:</strong> Login to the staff portal:<br/>
                    <a href="${loginUrl}">${loginUrl}</a>
                  </p>
                  <p>Your PIN is the last 4 digits of your phone: <strong>${staffPin}</strong></p>
                  <p>Keep this PIN secure - you'll need it to verify sales and redeem samples.</p>
                </div>
              `
            });
            console.log('✅ Staff verification email sent to:', staff.email);
          } catch (emailErr) {
            console.warn('Email send failed (staff welcome):', emailErr);
          }
        }
      }
    }

    // Send owner confirmation SMS (if phone provided)
    if (ownerPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const cleanPhone = ownerPhone.replace(/\D/g, '');
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const smsMessage = `🎉 Congratulations! Your store "${businessName}" has been successfully created with QRDisplay!\n\nYour Display Kit will be shipped out shortly.\n\n📱 Please save this number (${process.env.TWILIO_PHONE_NUMBER}) in your contacts as "QRDisplay Alerts" so you'll recognize future updates.\n\nStore ID: ${store.storeId}\nAdmin PIN: ${staffPin}\n\nWelcome to the QRDisplay family!`;
        
        await client.messages.create({
          to: `+1${cleanPhone}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: smsMessage
        });
        console.log('✅ Owner confirmation SMS sent to:', cleanPhone);
      } catch (smsErr) {
        console.warn('❌ Owner SMS send failed:', smsErr);
      }
    }

    // Send owner confirmation email
    if (ownerEmail && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // Get brand names for email
        const brandNamesPromises = brandPartnerships.map(async (partnership: any) => {
          const brand = await prisma.organization.findUnique({ 
            where: { id: partnership.brandId }, 
            select: { name: true } 
          });
          return brand?.name || 'Unknown Brand';
        });
        const brandNames = await Promise.all(brandNamesPromises);
        
        await resend.emails.send({
          from: 'QRDisplay <noreply@qrdisplay.com>',
          to: ownerEmail,
          cc: ['JimBonutto@vitadreamz.com'], // QRDisplay Sales Rep and Contact
          subject: `🎉 Welcome to QRDisplay - ${businessName} Store Created!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
                .info-box { background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
                .emoji { font-size: 48px; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="emoji">🎉</div>
                  <h1 style="margin: 0; font-size: 28px;">Congratulations!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your QRDisplay Store is Ready</p>
                </div>
                
                <div class="content">
                  <h2>Welcome to QRDisplay, ${ownerName || businessName}!</h2>
                  
                  <p>Your store has been successfully created and your Display Kit will be shipped out shortly! Here are your store details:</p>
                  
                  <div class="info-box">
                    <strong>📍 Store Information</strong><br>
                    <strong>Store Name:</strong> ${businessName}<br>
                    <strong>Store ID:</strong> ${store.storeId}<br>
                    <strong>Location:</strong> ${city}, ${state}<br>
                    <strong>Admin PIN:</strong> ${staffPin}
                  </div>
                  
                  <div class="info-box">
                    <strong>🏷️ Brand Partnerships</strong><br>
                    You've been partnered with: ${brandNames.join(', ')}
                  </div>
                  
                  <h3>📦 What's Next?</h3>
                  <ol>
                    <li><strong>Display Kit Shipping:</strong> Your QR display kit will be shipped to your store address within 2-3 business days</li>
                    <li><strong>Setup Instructions:</strong> Easy setup instructions will be included with your kit</li>
                    <li><strong>Start Sampling:</strong> Once activated, customers can start requesting samples immediately!</li>
                  </ol>
                  
                  <h3>💡 Important Reminders</h3>
                  <ul>
                    <li>Save <strong>${process.env.TWILIO_PHONE_NUMBER || 'our SMS number'}</strong> in your contacts as "QRDisplay Alerts"</li>
                    <li>Keep your Admin PIN (${staffPin}) secure - you'll need it to manage your store</li>
                    <li>Check your email for order confirmations and shipping updates</li>
                  </ul>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <p>Questions? Contact our team:</p>
                    <p><strong>Jim Bonutto</strong><br>
                    📧 <a href="mailto:JimBonutto@vitadreamz.com">JimBonutto@vitadreamz.com</a></p>
                  </div>
                </div>
                
                <div class="footer">
                  <p>© 2025 QRDisplay. Powered by VitaDreamz.</p>
                  <p>This email was sent to ${ownerEmail} regarding store ${store.storeId}</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        console.log('✅ Owner confirmation email sent to:', ownerEmail);
        console.log('✅ CC sent to: JimBonutto@vitadreamz.com');
      } catch (emailErr) {
        console.warn('❌ Owner email send failed:', emailErr);
      }
    }

    // Sync store to Shopify wholesale customers for each brand partnership
    console.log('\n🔄 Starting Shopify customer sync...');
    try {
      const { syncStoreToAllBrands } = await import('@/lib/shopify-customer-sync');
      const brandDbIds = brandPartnerships.map((p: any) => p.brandId);
      
      const syncResult = await syncStoreToAllBrands(
        store,
        brandDbIds,
        subscriptionTier || 'tester'
      );
      
      console.log(`📊 Shopify sync results:`, syncResult);
      
      // Log any failures but don't block store creation
      if (syncResult.failed > 0) {
        console.warn(`⚠️ ${syncResult.failed} Shopify sync(s) failed - check logs above`);
      }
    } catch (syncError) {
      console.error('❌ Shopify sync error (non-blocking):', syncError);
      // Continue anyway - store was created successfully
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        storeId: store.storeId,
        storeName: store.storeName,
        staffPin,
      },
    });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
