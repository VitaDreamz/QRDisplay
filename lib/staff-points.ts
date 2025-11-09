/**
 * Staff Points Gamification System
 * 
 * Point values:
 * - Sample redeemed: 5 points
 * - Online purchase: 1 point per dollar
 * - In-store purchase: 2 points per dollar
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get current quarter string (e.g., "2025-Q1")
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-based
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Check if staff member needs quarterly reset
 */
async function checkAndResetQuarterly(staffId: string): Promise<void> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { lastQuarterReset: true, quarterlyPoints: true }
  });

  if (!staff) return;

  const currentQuarter = getCurrentQuarter();
  const lastReset = staff.lastQuarterReset;
  
  // If never reset or last reset was in a different quarter, reset
  if (!lastReset || getQuarterFromDate(lastReset) !== currentQuarter) {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        quarterlyPoints: 0,
        lastQuarterReset: new Date()
      }
    });
  }
}

/**
 * Get quarter string from a date
 */
function getQuarterFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Award points to a staff member
 */
export async function awardStaffPoints(params: {
  staffId: string;
  storeId: string;
  orgId: string;
  points: number;
  type: 'sample' | 'online_sale' | 'instore_sale' | 'manual_adjustment';
  reason: string;
  customerId?: string;
  conversionId?: string;
  purchaseIntentId?: string;
}): Promise<void> {
  const { staffId, storeId, orgId, points, type, reason, customerId, conversionId, purchaseIntentId } = params;

  console.log(`🎮 awardStaffPoints called:`, { staffId, storeId, orgId, points, type });

  // Check and reset quarterly points if needed
  await checkAndResetQuarterly(staffId);

  const quarter = getCurrentQuarter();
  
  console.log(`📅 Current quarter: ${quarter}`);

  // Create point transaction
  const transaction = await prisma.staffPointTransaction.create({
    data: {
      staffId,
      storeId,
      orgId,
      points,
      type,
      reason,
      customerId,
      conversionId,
      purchaseIntentId: purchaseIntentId || undefined, // Convert empty string to undefined
      quarter,
    },
  });
  
  console.log(`✅ Point transaction created: ${transaction.id}`);

  // Update staff total and quarterly points
  const updatedStaff = await prisma.staff.update({
    where: { id: staffId },
    data: {
      totalPoints: { increment: points },
      quarterlyPoints: { increment: points },
    },
  });

  console.log(`🎯 Staff updated: totalPoints=${updatedStaff.totalPoints}, quarterlyPoints=${updatedStaff.quarterlyPoints}`);
  console.log(`✅ Awarded ${points} points to staff ${staffId} for ${type}`);
}

/**
 * Award points for sample redemption
 */
export async function awardSamplePoints(params: {
  staffId: string;
  storeId: string;
  orgId: string;
  customerId: string;
  customerName: string;
}): Promise<void> {
  await awardStaffPoints({
    staffId: params.staffId,
    storeId: params.storeId,
    orgId: params.orgId,
    points: 5,
    type: 'sample',
    reason: `Sample redeemed by ${params.customerName}`,
    customerId: params.customerId,
  });
}

/**
 * Award points for online sale (1 point per dollar)
 */
export async function awardOnlineSalePoints(params: {
  staffId: string;
  storeId: string;
  orgId: string;
  saleAmount: number;
  customerId: string;
  customerName: string;
  conversionId: string;
}): Promise<void> {
  const points = Math.floor(params.saleAmount); // 1 point per dollar
  
  await awardStaffPoints({
    staffId: params.staffId,
    storeId: params.storeId,
    orgId: params.orgId,
    points,
    type: 'online_sale',
    reason: `Online sale: ${params.customerName} - $${params.saleAmount.toFixed(2)}`,
    customerId: params.customerId,
    conversionId: params.conversionId,
  });
}

/**
 * Award points for in-store sale (2 points per dollar)
 */
export async function awardInStoreSalePoints(params: {
  staffId: string;
  storeId: string;
  orgId: string;
  saleAmount: number;
  customerId: string;
  customerName: string;
  purchaseIntentId: string;
}): Promise<void> {
  const points = Math.floor(params.saleAmount * 2); // 2 points per dollar
  
  await awardStaffPoints({
    staffId: params.staffId,
    storeId: params.storeId,
    orgId: params.orgId,
    points,
    type: 'instore_sale',
    reason: `In-store sale: ${params.customerName} - $${params.saleAmount.toFixed(2)}`,
    customerId: params.customerId,
    purchaseIntentId: params.purchaseIntentId,
  });
}
