/**
 * Inventory Conversion Utilities
 * 
 * Converts wholesale box orders to retail inventory units.
 * Naming convention: Wholesale boxes are retail SKU + "-BX"
 * Example: VD-SB-30-BX (box) → VD-SB-30 (retail units)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WholesaleLineItem {
  sku: string;
  quantity: number; // Number of boxes
  price?: number;
}

export interface RetailInventoryUpdate {
  retailSku: string;
  retailProductName: string;
  unitsToAdd: number;
  wholesaleBoxSku: string;
  boxQuantity: number;
  unitsPerBox: number;
}

export interface ConversionResult {
  success: boolean;
  updates: RetailInventoryUpdate[];
  errors: string[];
}

/**
 * Converts wholesale box SKU to retail SKU
 * @param wholesaleSku - Wholesale box SKU (e.g., "VD-SB-30-BX")
 * @returns Retail SKU (e.g., "VD-SB-30") or null if not a wholesale box
 */
export function getRetailSkuFromWholesale(wholesaleSku: string): string | null {
  if (!wholesaleSku.endsWith('-BX')) {
    return null;
  }
  return wholesaleSku.replace(/-BX$/, '');
}

/**
 * Gets the wholesale box SKU from a retail SKU
 * @param retailSku - Retail SKU (e.g., "VD-SB-30")
 * @returns Wholesale box SKU (e.g., "VD-SB-30-BX")
 */
export function getWholesaleSkuFromRetail(retailSku: string): string {
  return `${retailSku}-BX`;
}

/**
 * Converts wholesale box line items to retail inventory updates
 * Looks up product details from database to get unitsPerBox
 * 
 * @param wholesaleItems - Array of wholesale box line items
 * @param orgId - Organization ID (e.g., "ORG-VITADREAMZ")
 * @returns Conversion result with retail inventory updates and any errors
 */
export async function convertWholesaleToRetail(
  wholesaleItems: WholesaleLineItem[],
  orgId: string
): Promise<ConversionResult> {
  const updates: RetailInventoryUpdate[] = [];
  const errors: string[] = [];

  for (const item of wholesaleItems) {
    // Check if this is a wholesale box
    const retailSku = getRetailSkuFromWholesale(item.sku);
    if (!retailSku) {
      errors.push(`SKU ${item.sku} is not a wholesale box (doesn't end with -BX)`);
      continue;
    }

    // Look up the wholesale product to get unitsPerBox
    const wholesaleProduct = await prisma.product.findFirst({
      where: {
        sku: item.sku,
        orgId,
        productType: 'wholesale-box',
        active: true
      }
    });

    if (!wholesaleProduct) {
      errors.push(`Wholesale product ${item.sku} not found or inactive`);
      continue;
    }

    if (!wholesaleProduct.unitsPerBox || wholesaleProduct.unitsPerBox <= 0) {
      errors.push(`Wholesale product ${item.sku} has invalid unitsPerBox: ${wholesaleProduct.unitsPerBox}`);
      continue;
    }

    // Look up the retail product to verify it exists
    const retailProduct = await prisma.product.findFirst({
      where: {
        sku: retailSku,
        orgId,
        productType: 'retail',
        active: true
      }
    });

    if (!retailProduct) {
      errors.push(`Retail product ${retailSku} not found or inactive (converted from ${item.sku})`);
      continue;
    }

    // Calculate total units
    const unitsToAdd = item.quantity * wholesaleProduct.unitsPerBox;

    updates.push({
      retailSku,
      retailProductName: retailProduct.name,
      unitsToAdd,
      wholesaleBoxSku: item.sku,
      boxQuantity: item.quantity,
      unitsPerBox: wholesaleProduct.unitsPerBox
    });
  }

  return {
    success: errors.length === 0,
    updates,
    errors
  };
}

/**
 * Creates or updates store inventory based on wholesale box order
 * Also creates inventory transaction records for audit trail
 * 
 * @param storeId - Store ID (e.g., "SID-001")
 * @param wholesaleItems - Array of wholesale box line items
 * @param orgId - Organization ID
 * @param transactionType - Type of transaction ("restock", "initial_stock", "trial_kit", etc.)
 * @param notes - Optional notes for the transaction
 * @returns Conversion result
 */
export async function applyWholesaleToStoreInventory(
  storeId: string,
  wholesaleItems: WholesaleLineItem[],
  orgId: string,
  transactionType: string = 'restock',
  notes?: string
): Promise<ConversionResult> {
  const conversionResult = await convertWholesaleToRetail(wholesaleItems, orgId);

  if (!conversionResult.success) {
    return conversionResult;
  }

  // Apply each update to store inventory
  for (const update of conversionResult.updates) {
    try {
      // Get or create store inventory record
      let inventory = await prisma.storeInventory.findUnique({
        where: {
          storeId_productSku: {
            storeId,
            productSku: update.retailSku
          }
        }
      });

      const previousBalance = inventory?.quantityOnHand || 0;
      const newBalance = previousBalance + update.unitsToAdd;

      if (inventory) {
        // Update existing inventory
        inventory = await prisma.storeInventory.update({
          where: {
            storeId_productSku: {
              storeId,
              productSku: update.retailSku
            }
          },
          data: {
            quantityOnHand: newBalance,
            quantityAvailable: {
              increment: update.unitsToAdd
            },
            updatedAt: new Date()
          }
        });
      } else {
        // Create new inventory record
        inventory = await prisma.storeInventory.create({
          data: {
            storeId,
            productSku: update.retailSku,
            quantityOnHand: update.unitsToAdd,
            quantityReserved: 0,
            quantityAvailable: update.unitsToAdd
          }
        });
      }

      // Create transaction record for audit trail
      const transactionNotes = notes || 
        `Received ${update.boxQuantity} box(es) of ${update.wholesaleBoxSku} (${update.unitsPerBox} units per box)`;

      await prisma.inventoryTransaction.create({
        data: {
          storeId,
          productSku: update.retailSku,
          type: transactionType,
          quantity: update.unitsToAdd,
          balanceAfter: newBalance,
          notes: transactionNotes
        }
      });

    } catch (error) {
      conversionResult.errors.push(
        `Failed to update inventory for ${update.retailSku}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return {
    ...conversionResult,
    success: conversionResult.errors.length === 0
  };
}

/**
 * Validates that all wholesale SKUs in a list are valid and active
 * @param wholesaleSkus - Array of wholesale SKUs to validate
 * @param orgId - Organization ID
 * @returns Object with valid SKUs and any errors
 */
export async function validateWholesaleSkus(
  wholesaleSkus: string[],
  orgId: string
): Promise<{ valid: string[]; invalid: string[]; errors: string[] }> {
  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];

  for (const sku of wholesaleSkus) {
    // Check naming convention
    if (!sku.endsWith('-BX')) {
      invalid.push(sku);
      errors.push(`${sku} is not a wholesale box SKU (doesn't end with -BX)`);
      continue;
    }

    // Check if product exists in database
    const product = await prisma.product.findFirst({
      where: {
        sku,
        orgId,
        productType: 'wholesale-box'
      }
    });

    if (!product) {
      invalid.push(sku);
      errors.push(`${sku} not found in database`);
      continue;
    }

    if (!product.active) {
      invalid.push(sku);
      errors.push(`${sku} is inactive`);
      continue;
    }

    valid.push(sku);
  }

  return { valid, invalid, errors };
}
