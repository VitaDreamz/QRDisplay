import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendActivationEmail } from '@/lib/email';
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
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      timezone,
      promoOffer,
      followupDays,
      pin,
    } = body;

    // Validate required fields
    if (
      !displayId ||
      !storeName ||
      !contactName ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !zip ||
      !timezone ||
      !pin ||
      !followupDays ||
      !Array.isArray(followupDays)
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format (US) - allow + for international format
    const phoneRegex = /^[\+\d\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(phone)) {
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

    // Check if display is already activated (has a storeId)
    if (display.storeId) {
      return NextResponse.json(
        { error: 'Display has already been activated' },
        { status: 400 }
      );
    }

  // Generate Store ID (SID-001, SID-002, etc.)
  // Get count of existing stores to generate next ID
  const storeCount = await prisma.store.count();
  const storeId = generateStoreId(storeCount + 1);

    // Create the store
    const store = await prisma.store.create({
      data: {
        storeId,
          storeName,
        contactName,
          contactEmail: email,
          contactPhone: phone,
          streetAddress: address,
        city,
        state,
          zipCode: zip,
        timezone,
          promoOffer: promoOffer || '20% Off 1st In-Store Purchase',
        followupDays,
          staffPin: pin,
        orgId: orgId,
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

    // Create short magic link for store login
    const slug = generateBase62Slug(7);
    await prisma.shortlink.create({
      data: {
        slug,
        action: 'store_login',
        storeId: store.storeId,
        role: 'store',
      }
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const shortLinkUrl = `${baseUrl}/s/${slug}`;

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
            contactEmail: email,
            contactName,
            storeName,
            storeId: store.storeId,
          },
          display: { displayId },
          settings: {
            promoOffer,
            followupDays,
            timezone,
            contactPhone: phone,
            streetAddress: address,
            city,
            state,
            zipCode: zip,
          },
          shortLinkUrl,
        });
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

      // 1. SMS to store contact
  const storeMessage = `Hi ${contactName}, your new sample display for ${storeName} is now activated and ready for customers!\n\nAccess your dashboard: ${shortLinkUrl}\n\nReply HELP for support.`;
      
      await client.messages.create({
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: storeMessage
      });
      console.log('✅ Store activation SMS sent to:', phone);

      // 2. SMS to brand owner (if exists and has phone)
      if (brandOwner && brandOwner.phone) {
        const ownerMessage = `New store activated! ${storeName} (${store.storeId}) in ${city}, ${state}. Contact: ${contactName} ${phone}`;
        
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
            contactPhone: phone,
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
