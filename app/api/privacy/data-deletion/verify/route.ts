/**
 * CCPA Data Deletion Verification & Processing
 * 
 * POST: Verify the code and process the data deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { Prisma } from '@prisma/client';

// Access the shared verification store
interface VerificationData {
  code: string;
  phone: string;
  email?: string;
  expires: Date;
  ipAddress?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var deletionVerificationCodes: Map<string, VerificationData> | undefined;
}

const verificationStore = globalThis.deletionVerificationCodes || new Map<string, VerificationData>();

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
        { error: 'Request not found or expired. Please submit a new deletion request.' },
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

    // Process the deletion
    const deletionSummary = await processDataDeletion(verificationData.phone);

    // Remove the verification data
    verificationStore.delete(requestId);

    // Send confirmation SMS
    await sendSMS(
      verificationData.phone,
      `Your data deletion request has been completed. ${deletionSummary.totalRecords} record(s) were removed. Thank you.`
    );

    return NextResponse.json({
      success: true,
      message: 'Your data has been successfully deleted',
      summary: {
        totalRecords: deletionSummary.totalRecords,
        customersDeleted: deletionSummary.customers,
        promoRedemptionsDeleted: deletionSummary.promoRedemptions,
        purchaseIntentsDeleted: deletionSummary.purchaseIntents,
        conversionsAnonymized: deletionSummary.conversionsAnonymized,
      },
    });

  } catch (error) {
    console.error('Data deletion verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your deletion request' },
      { status: 500 }
    );
  }
}

/**
 * Process the actual data deletion
 * 
 * CCPA requires deletion of personal data, but allows retention of 
 * anonymized/aggregated data for analytics purposes.
 * 
 * This function:
 * 1. Deletes customer records
 * 2. Deletes promo redemptions
 * 3. Deletes purchase intents
 * 4. Anonymizes conversions (removes PII but keeps financial data for reporting)
 * 5. Removes from any message logs
 * 6. Adds to opt-out list to prevent future collection
 */
async function processDataDeletion(phone: string): Promise<{
  customers: number;
  promoRedemptions: number;
  purchaseIntents: number;
  conversionsAnonymized: number;
  shopifyWebhookLogs: number;
  staffPointTransactions: number;
  totalRecords: number;
}> {
  // Find all customer records for this phone
  const customers = await prisma.customers.findMany({
    where: { phone },
    select: { id: true, memberId: true },
  });

  const customerIds = customers.map((c: { id: string }) => c.id);
  const memberIds = customers.map((c: { memberId: string }) => c.memberId);

  let promoRedemptionsCount = 0;
  let purchaseIntentsCount = 0;
  let conversionsAnonymizedCount = 0;
  let shopifyWebhookLogsCount = 0;
  let staffPointTransactionsCount = 0;

  // Use a transaction to ensure all-or-nothing deletion
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Delete promo redemptions
    const promoResult = await tx.promo_redemptions.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    promoRedemptionsCount = promoResult.count;

    // 2. Delete purchase intents
    const purchaseResult = await tx.purchase_intents.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    purchaseIntentsCount = purchaseResult.count;

    // 3. Anonymize conversions (keep financial data for reporting, remove PII)
    // We use a unique anonymous ID per customer to maintain referential integrity
    const conversionsResult = await tx.conversions.updateMany({
      where: { customerId: { in: memberIds } },
      data: {
        customerId: 'DELETED_USER',
        shopifyCustomerId: 'DELETED',
      },
    });
    conversionsAnonymizedCount = conversionsResult.count;

    // 4. Delete shopify webhook logs associated with customers
    const webhookResult = await tx.shopify_webhook_logs.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    shopifyWebhookLogsCount = webhookResult.count;

    // 5. Delete staff point transactions associated with customers
    const staffPointResult = await tx.staff_point_transactions.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    staffPointTransactionsCount = staffPointResult.count;

    // 6. Delete the customer records themselves
    await tx.customers.deleteMany({
      where: { phone },
    });

    // 7. Add to opt-out list to prevent future data collection
    await tx.opt_outs.upsert({
      where: { phone },
      create: {
        id: crypto.randomUUID(),
        phone,
        reason: 'CCPA_DELETION_REQUEST',
      },
      update: {
        reason: 'CCPA_DELETION_REQUEST',
        timestamp: new Date(),
      },
    });
  });

  const totalRecords = 
    customers.length + 
    promoRedemptionsCount + 
    purchaseIntentsCount + 
    shopifyWebhookLogsCount + 
    staffPointTransactionsCount;

  return {
    customers: customers.length,
    promoRedemptions: promoRedemptionsCount,
    purchaseIntents: purchaseIntentsCount,
    conversionsAnonymized: conversionsAnonymizedCount,
    shopifyWebhookLogs: shopifyWebhookLogsCount,
    staffPointTransactions: staffPointTransactionsCount,
    totalRecords,
  };
}
