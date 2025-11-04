import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendActivationEmail, sendBrandStoreActivationEmail } from '@/lib/email';
import { generateBase62Slug } from '@/lib/shortid';

// Helper to generate a new Store ID with 3-digit minimum padding
function generateStoreId(nextIndex: number) {
  return `SID-${nextIndex.toString().padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      displayId,
      storeName,
      adminName,
      adminEmail,
      adminPhone,
      address,
      city,
      state,
      zip,
      timezone,
      promoOffer,
      followupDays,
      pin,
      ownerName,
      ownerPhone,
      ownerEmail,
      purchasingManager,
      purchasingPhone,
      purchasingEmail,
      purchasingSameAsOwner,
      adminSameAsOwner,
      availableSamples,
    } = body;

    // Validate required fields
    if (
      !displayId ||
      !storeName ||
      !adminName ||
      !adminEmail ||
      !adminPhone ||
      !address ||
      !city ||
      !state ||
      !zip ||
      !timezone ||
      !pin ||
      !followupDays ||
      !Array.isArray(followupDays) ||
      !ownerName ||
      !ownerPhone ||
      !ownerEmail
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format (US) - allow + for international format
    const phoneRegex = /^[\+\d\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(adminPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate PIN (4 digits)
    const pinRegex = /^\d{4}$/;
    if (!pinRegex.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Validate available samples (require at least 1)
    if (!availableSamples || !Array.isArray(availableSamples) || availableSamples.length === 0) {
      return NextResponse.json(
        { error: 'At least one sample product must be selected' },
        { status: 400 }
      );
    }

    // Validate ZIP (5 digits)
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zip)) {
      return NextResponse.json(
        { error: 'ZIP code must be exactly 5 digits' },
        { status: 400 }
      );
    }

    // Validate state (2 uppercase letters)
    const stateRegex = /^[A-Z]{2}$/;
    if (!stateRegex.test(state)) {
      return NextResponse.json(
        { error: 'State must be a valid 2-letter code' },
        { status: 400 }
      );
    }

    // Validate followup days (must select exactly two)
    if (!Array.isArray(followupDays) || followupDays.length !== 2) {
      return NextResponse.json(
        { error: 'Please select exactly two follow-up days' },
        { status: 400 }
      );
    }

    // Check if display exists and get its details (with organization for email)
    const display = (await prisma.display.findUnique({
      where: { displayId },
      include: { organization: true },
    })) as any;

    if (!display) {
      return NextResponse.json(
        { error: 'Display not found' },
        { status: 404 }
      );
    }

    // Check if display status is 'sold' or 'inventory'
    if (display.status !== 'sold' && display.status !== 'inventory') {
      return NextResponse.json(
        { error: `Display cannot be activated. Current status: ${display.status}` },
        { status: 400 }
      );
    }

    // For inventory displays, use ownerOrgId; for sold displays, use assignedOrgId
    const orgId = display.status === 'inventory' ? display.ownerOrgId : display.assignedOrgId;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Display has not been assigned to an organization' },
        { status: 400 }
      );
    }

    // Check if display is already fully activated (has storeId AND status is active)
    if (display.storeId && display.status === 'active') {
      // Check if store actually exists in database
      const existingStore = await prisma.store.findUnique({
        where: { storeId: display.storeId },
      });
      
      if (existingStore) {
        return NextResponse.json(
          { error: 'Display has already been activated' },
          { status: 400 }
        );
      }
      // If store doesn't exist but display has storeId, allow re-activation (failed previous attempt)
    }

  // Generate Store ID (SID-001, SID-002, etc.)
  // If display already has a storeId (from failed activation), use it; otherwise generate new one
  let storeId = display.storeId;
  
  if (!storeId) {
    const storeCount = await prisma.store.count();
    storeId = generateStoreId(storeCount + 1);
  }

    // Upsert the store (create if doesn't exist, update if it does)
    // This handles cases where a previous activation partially succeeded
    const store = await prisma.store.upsert({
      where: { storeId },
      create: {
        storeId,
        storeName,
        adminName,
        adminEmail,
        adminPhone,
        streetAddress: address,
        city,
        state,
        zipCode: zip,
        timezone,
        promoOffer: promoOffer || '20% Off In-Store Purchase',
        followupDays,
        staffPin: pin,
        orgId: orgId,
        ownerName,
        ownerPhone,
        ownerEmail,
        purchasingManager: purchasingSameAsOwner ? ownerName : purchasingManager,
        purchasingPhone: purchasingSameAsOwner ? ownerPhone : purchasingPhone,
        purchasingEmail: purchasingSameAsOwner ? ownerEmail : purchasingEmail,
        availableSamples,
      },
      update: {
        storeName,
        adminName,
        adminEmail,
        adminPhone,
        streetAddress: address,
        city,
        state,
        zipCode: zip,
        timezone,
        promoOffer: promoOffer || '20% Off In-Store Purchase',
        followupDays,
        staffPin: pin,
        ownerName,
        ownerPhone,
        ownerEmail,
        purchasingManager: purchasingSameAsOwner ? ownerName : purchasingManager,
        purchasingPhone: purchasingSameAsOwner ? ownerPhone : purchasingPhone,
        purchasingEmail: purchasingSameAsOwner ? ownerEmail : purchasingEmail,
        availableSamples,
      },
    });

    // Update the display to mark it as active
    await prisma.display.update({
      where: { displayId },
      data: {
        status: 'active',
        storeId: store.storeId,
        activatedAt: new Date(),
      },
    });

    // Use permanent login link for store dashboard
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const loginUrl = `${baseUrl}/store/login/${store.storeId}`;

    // Send activation email (non-blocking for overall activation)
    try {
      if (!display.organization) {
        console.warn('Display organization missing; skipping email send');
      } else {
        await sendActivationEmail({
          organization: {
            name: display.organization.name,
            logoUrl: display.organization.logoUrl || undefined,
            emailFromName: display.organization.emailFromName || undefined,
            emailFromAddress: display.organization.emailFromAddress || undefined,
            supportEmail: display.organization.supportEmail || undefined,
            supportPhone: display.organization.supportPhone || undefined,
            websiteUrl: display.organization.websiteUrl || undefined,
          },
          store: {
            contactEmail: adminEmail,
            contactName: adminName,
            storeName,
            storeId: store.storeId,
          },
          display: { displayId },
          settings: {
            promoOffer,
            followupDays,
            timezone,
            contactPhone: adminPhone,
            streetAddress: address,
            city,
            state,
            zipCode: zip,
          },
          shortLinkUrl: loginUrl,
          ownerPin: pin,
        });

        // Send brand notification email
        if (display.organization.supportEmail) {
          await sendBrandStoreActivationEmail({
            brandEmail: display.organization.supportEmail,
            store: {
              storeName,
              contactEmail: adminEmail,
              contactPhone: adminPhone,
              streetAddress: address,
              city,
              state,
              zipCode: zip,
            },
            display: { displayId },
            settings: { staffPin: pin },
            activatedAt: new Date(),
          });
        }
      }
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't fail activation if email fails
    }

    // Get brand owner details for notification
    const brandOwner = (await prisma.user.findFirst({
      where: {
        orgId: display.assignedOrgId,
        role: 'org-admin',
      },
    })) as any;

    // Send activation SMS notifications
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // 1. SMS to store administrator
  const storeMessage = `🏪 Your display is active! Dashboard: ${loginUrl} | PIN: ${pin} | Bookmark this link!`;
      
      await client.messages.create({
        to: adminPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: storeMessage
      });
      console.log('✅ Store activation SMS sent to:', adminPhone);

      // 2. SMS to brand owner (if exists and has phone)
      if (brandOwner && brandOwner.phone) {
        const ownerMessage = `New store activated! ${storeName} (${store.storeId}) in ${city}, ${state}. Contact: ${adminName} ${adminPhone}`;
        
        await client.messages.create({
          to: brandOwner.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: ownerMessage
        });
        console.log('✅ Brand owner notification SMS sent to:', brandOwner.phone);
      }

    } catch (smsError) {
      console.error('❌ SMS send failed:', smsError);
      // Don't fail the activation if SMS fails
    }

    // Send email notification to brand owner
    try {
      if (brandOwner && brandOwner.email && display.organization) {
        await sendActivationEmail({
          organization: {
            name: display.organization.name,
            logoUrl: display.organization.logoUrl || undefined,
            emailFromName: display.organization.emailFromName || undefined,
            emailFromAddress: display.organization.emailFromAddress || undefined,
            supportEmail: display.organization.supportEmail || undefined,
            supportPhone: display.organization.supportPhone || undefined,
            websiteUrl: display.organization.websiteUrl || undefined,
          },
          store: {
            contactEmail: brandOwner.email,
            contactName: brandOwner.name || 'Brand Owner',
            storeName: `New Store: ${storeName}`,
            storeId: store.storeId,
          },
          display: { displayId },
          settings: {
            promoOffer,
            followupDays,
            timezone,
            contactPhone: adminPhone,
            streetAddress: address,
            city,
            state,
            zipCode: zip,
          },
        });
        console.log('✅ Brand owner activation email sent to:', brandOwner.email);
      }
    } catch (ownerEmailError) {
      console.error('❌ Brand owner email send failed:', ownerEmailError);
      // Don't fail activation if email fails
    }

    return NextResponse.json({
      ok: true,
      storeId: store.storeId,
        storeName: store.storeName,
      message: 'Display activated successfully',
    });
  } catch (error) {
    console.error('Error activating display:', error);
    return NextResponse.json(
      { error: 'An error occurred while activating the display' },
      { status: 500 }
    );
  }
}
