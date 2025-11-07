/**
 * Commission calculation for sample-to-purchase conversions
 */

import { Organization, Customer } from '@prisma/client';

/**
 * Calculate commission for a purchase
 */
export function calculateCommission(
  orderTotal: number,
  commissionRate: number
): number {
  return orderTotal * (commissionRate / 100);
}

/**
 * Check if a purchase is within the attribution window
 */
export function isWithinAttributionWindow(
  sampleDate: Date,
  purchaseDate: Date,
  attributionWindowDays: number
): boolean {
  const daysDifference = Math.floor(
    (purchaseDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysDifference >= 0 && daysDifference <= attributionWindowDays;
}

/**
 * Calculate days between sample and purchase
 */
export function getDaysToConversion(
  sampleDate: Date,
  purchaseDate: Date
): number {
  return Math.floor(
    (purchaseDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Determine if a conversion should be attributed to a store
 */
export function shouldAttributeConversion(
  customer: Customer,
  org: Organization,
  purchaseDate: Date
): {
  shouldAttribute: boolean;
  reason: string;
  daysToConversion?: number;
} {
  // Customer must have a sample date
  if (!customer.sampleDate) {
    return {
      shouldAttribute: false,
      reason: 'No sample date recorded',
    };
  }

  // Must have attributed store
  if (!customer.attributedStoreId) {
    return {
      shouldAttribute: false,
      reason: 'No attributed store',
    };
  }

  // Check attribution window
  const attributionWindow = org.attributionWindow || 30;
  const daysToConversion = getDaysToConversion(customer.sampleDate, purchaseDate);
  
  if (!isWithinAttributionWindow(customer.sampleDate, purchaseDate, attributionWindow)) {
    return {
      shouldAttribute: false,
      reason: `Outside attribution window (${daysToConversion} days, limit is ${attributionWindow} days)`,
      daysToConversion,
    };
  }

  return {
    shouldAttribute: true,
    reason: 'Within attribution window',
    daysToConversion,
  };
}
