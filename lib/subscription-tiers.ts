/**
 * Subscription Tier Definitions
 * 
 * Freemium model with 4 tiers for store subscriptions
 * Stores pay their organization quarterly via Recharge
 */

export type SubscriptionTier = 'free' | 'basic' | 'dreamer' | 'mega';

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  price: number; // Quarterly price in dollars
  description: string;
  features: {
    samplesPerQuarter: number;
    wholesaleBoxAccess: boolean;
    wholesaleBoxTypes?: string[]; // Which box sizes they can order
    newCustomersPerBilling: number; // Customer slots granted each billing cycle (accumulates!)
    commissionRate: number; // Percentage of attributed sales
    promoReimbursementRate: number; // Percentage of promo value as store credit
  };
  rechargeProductId?: string; // Set when Recharge products are created
  stripePriceId?: string; // If using Stripe instead
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    description: 'Perfect for getting started with sampling',
    features: {
      samplesPerQuarter: 10,
      wholesaleBoxAccess: false,
      newCustomersPerBilling: 10, // Get 10 new customer slots each quarter
      commissionRate: 5.0,
      promoReimbursementRate: 10.0,
    },
  },
  
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 150,
    description: 'Great for small stores starting to scale',
    features: {
      samplesPerQuarter: 20,
      wholesaleBoxAccess: true,
      wholesaleBoxTypes: ['4ct'], // Can order 4-count boxes
      newCustomersPerBilling: 50, // Get 50 new customer slots each quarter
      commissionRate: 10.0,
      promoReimbursementRate: 25.0,
    },
  },
  
  dreamer: {
    id: 'dreamer',
    name: 'Dreamer',
    price: 249,
    description: 'Ideal for growing stores with steady traffic',
    features: {
      samplesPerQuarter: 40,
      wholesaleBoxAccess: true,
      wholesaleBoxTypes: ['4ct', '20ct', '30ct'], // Can order up to 30-count boxes
      newCustomersPerBilling: 100, // Get 100 new customer slots each quarter
      commissionRate: 20.0,
      promoReimbursementRate: 50.0,
    },
  },
  
  mega: {
    id: 'mega',
    name: 'Mega Dreamer',
    price: 499,
    description: 'For high-volume stores maximizing their program',
    features: {
      samplesPerQuarter: 60,
      wholesaleBoxAccess: true,
      wholesaleBoxTypes: ['4ct', '20ct', '30ct', '60ct'], // Can order all box sizes
      newCustomersPerBilling: 200, // Get 200 new customer slots each quarter
      commissionRate: 30.0,
      promoReimbursementRate: 100.0,
    },
  },
};

/**
 * Get tier configuration by ID
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Check if a store can access a specific wholesale box type
 */
export function canAccessWholesaleBox(tier: SubscriptionTier, boxType: string): boolean {
  const config = getTierConfig(tier);
  if (!config.features.wholesaleBoxAccess) return false;
  if (!config.features.wholesaleBoxTypes) return false;
  return config.features.wholesaleBoxTypes.includes(boxType);
}

/**
 * Check if a store has reached their customer limit
 * @param currentCount - Total customers currently in the system
 * @param customerSlotsGranted - Total slots granted from all billing cycles
 */
export function hasReachedCustomerLimit(currentCount: number, customerSlotsGranted: number): boolean {
  return currentCount >= customerSlotsGranted;
}

/**
 * Calculate total customer slots after a billing cycle completes
 */
export function calculateNewCustomerSlots(currentSlots: number, tier: SubscriptionTier): number {
  const config = getTierConfig(tier);
  return currentSlots + config.features.newCustomersPerBilling;
}

/**
 * Check if a store has samples remaining this quarter
 */
export function hasSamplesRemaining(usedCount: number, tier: SubscriptionTier): boolean {
  const config = getTierConfig(tier);
  return usedCount < config.features.samplesPerQuarter;
}

/**
 * Calculate commission amount for a sale
 */
export function calculateCommission(saleAmount: number, tier: SubscriptionTier): number {
  const config = getTierConfig(tier);
  return (saleAmount * config.features.commissionRate) / 100;
}

/**
 * Calculate promo reimbursement (store credit) for a promo redemption
 */
export function calculatePromoReimbursement(promoValue: number, tier: SubscriptionTier): number {
  const config = getTierConfig(tier);
  return (promoValue * config.features.promoReimbursementRate) / 100;
}

/**
 * Get upgrade options for a current tier
 */
export function getUpgradeOptions(currentTier: SubscriptionTier): TierConfig[] {
  const tiers: SubscriptionTier[] = ['free', 'basic', 'dreamer', 'mega'];
  const currentIndex = tiers.indexOf(currentTier);
  return tiers.slice(currentIndex + 1).map(tier => getTierConfig(tier));
}

/**
 * Format tier benefits for display
 */
export function formatTierBenefits(tier: SubscriptionTier): string[] {
  const config = getTierConfig(tier);
  const benefits = [
    `${config.features.samplesPerQuarter} samples per quarter`,
    `+${config.features.newCustomersPerBilling} customer slots each billing cycle`,
    `${config.features.commissionRate}% commission on sales`,
    `${config.features.promoReimbursementRate}% promo reimbursement`,
  ];
  
  if (config.features.wholesaleBoxAccess) {
    const boxTypes = config.features.wholesaleBoxTypes?.join(', ') || 'all sizes';
    benefits.push(`Wholesale boxes: ${boxTypes}`);
  } else {
    benefits.push('No wholesale box access');
  }
  
  return benefits;
}
