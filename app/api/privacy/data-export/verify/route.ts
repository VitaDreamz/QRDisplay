/**
 * CCPA Data Export Verification & Download
 * 
 * POST: Verify the code and return all customer data
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Access the shared verification store
interface ExportVerificationData {
  code: string;
  phone: string;
  expires: Date;
}

declare global {
  // eslint-disable-next-line no-var
  var exportVerificationCodes: Map<string, ExportVerificationData> | undefined;
}

const verificationStore = globalThis.exportVerificationCodes || new Map<string, ExportVerificationData>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, verificationCode } = body;

    if (!requestId || !verificationCode) {
      return NextResponse.json(
        { error: 'Request ID and verification code are required' },
        { status: 400 }
      );
    }

    // Find the verification data
    const verificationData = verificationStore.get(requestId);

    if (!verificationData) {
      return NextResponse.json(
        { error: 'Request not found or expired. Please submit a new export request.' },
        { status: 404 }
      );
    }

    // Check if expired
    if (verificationData.expires < new Date()) {
      verificationStore.delete(requestId);
      return NextResponse.json(
        { error: 'Verification code has expired. Please submit a new request.' },
        { status: 400 }
      );
    }

    // Verify the code
    if (verificationData.code !== verificationCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const phone = verificationData.phone;

    // Gather all customer data
    const customers = await prisma.customers.findMany({
      where: { phone },
    });

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No records found for this phone number' },
        { status: 404 }
      );
    }

    const customerIds = customers.map((c: { id: string }) => c.id);
    const memberIds = customers.map((c: { memberId: string }) => c.memberId);

    // Get related data
    const [
      promoRedemptions,
      purchaseIntents,
      conversions,
      sampleHistory,
    ] = await Promise.all([
      prisma.promo_redemptions.findMany({
        where: { customerId: { in: customerIds } },
        select: {
          promoOffer: true,
          promoSlug: true,
          redeemedAt: true,
          purchaseAmount: true,
          discountAmount: true,
          createdAt: true,
        },
      }),
      prisma.purchase_intents.findMany({
        where: { customerId: { in: customerIds } },
        select: {
          productSku: true,
          originalPrice: true,
          discountPercent: true,
          finalPrice: true,
          status: true,
          createdAt: true,
          fulfilledAt: true,
        },
      }),
      prisma.conversions.findMany({
        where: { customerId: { in: memberIds } },
        select: {
          orderNumber: true,
          orderTotal: true,
          sampleDate: true,
          purchaseDate: true,
          daysToConversion: true,
          createdAt: true,
        },
      }),
      prisma.sample_history.findMany({
        where: { customerId: { in: customerIds } },
        select: {
          productSku: true,
          productName: true,
          quantity: true,
          givenAt: true,
          sampledAt: true,
        },
      }),
    ]);

    // Remove the verification data after successful export
    verificationStore.delete(requestId);

    // Format customer data for export
    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: {
        phone,
      },
      customerRecords: customers.map((c: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
        requestedAt: Date;
        currentStage: string;
        smsOptedOut: boolean | null;
        source: string | null;
        status: string | null;
      }) => ({
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        registeredAt: c.requestedAt,
        currentStage: c.currentStage,
        smsOptedOut: c.smsOptedOut,
        source: c.source,
        status: c.status,
      })),
      sampleHistory: sampleHistory.map((s: {
        productName: string | null;
        productSku: string;
        quantity: number;
        sampledAt: Date | null;
        givenAt: Date;
      }) => ({
        product: s.productName || s.productSku,
        quantity: s.quantity,
        date: s.sampledAt || s.givenAt,
      })),
      promoRedemptions: promoRedemptions.map((p: {
        promoOffer: string;
        redeemedAt: Date | null;
        purchaseAmount: { toString(): string } | null;
        discountAmount: { toString(): string } | null;
      }) => ({
        offer: p.promoOffer,
        redeemedAt: p.redeemedAt,
        purchaseAmount: p.purchaseAmount ? parseFloat(p.purchaseAmount.toString()) : null,
        discountAmount: p.discountAmount ? parseFloat(p.discountAmount.toString()) : null,
      })),
      purchaseIntents: purchaseIntents.map((p: {
        productSku: string;
        originalPrice: { toString(): string };
        discountPercent: number;
        finalPrice: { toString(): string };
        status: string;
        createdAt: Date;
        fulfilledAt: Date | null;
      }) => ({
        product: p.productSku,
        originalPrice: parseFloat(p.originalPrice.toString()),
        discountPercent: p.discountPercent,
        finalPrice: parseFloat(p.finalPrice.toString()),
        status: p.status,
        createdAt: p.createdAt,
        fulfilledAt: p.fulfilledAt,
      })),
      purchases: conversions.map((c: {
        orderNumber: string;
        orderTotal: number;
        sampleDate: Date;
        purchaseDate: Date;
        daysToConversion: number;
      }) => ({
        orderNumber: c.orderNumber,
        orderTotal: c.orderTotal,
        sampleDate: c.sampleDate,
        purchaseDate: c.purchaseDate,
        daysAfterSample: c.daysToConversion,
      })),
      dataCategories: {
        personalInfo: 'Name, phone number, email address',
        transactionHistory: 'Sample redemptions, promo redemptions, purchases',
        preferences: 'Product preferences, SMS opt-out status',
        analytics: 'Conversion tracking, attribution data',
      },
      rights: {
        deletion: 'You can request deletion of your data at /privacy/delete-my-data',
        optOut: 'You can opt out of SMS by replying STOP to any message',
        correction: 'Contact us to correct any inaccurate information',
      },
    };

    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error) {
    console.error('Data export verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your export request' },
      { status: 500 }
    );
  }
}
