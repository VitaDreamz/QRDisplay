import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeName, boxQuantities, notes, contactName, contactEmail, contactPhone } = body;

    if (!storeId || !boxQuantities || Object.keys(boxQuantities).length === 0) {
      return NextResponse.json(
        { error: 'Store ID and at least one product are required' },
        { status: 400 }
      );
    }

    // Filter to only SKUs with quantity > 0
    const orderedSkus = Object.entries(boxQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([sku]) => sku);

    if (orderedSkus.length === 0) {
      return NextResponse.json(
        { error: 'At least one product with quantity > 0 is required' },
        { status: 400 }
      );
    }

    // Get product details
    const products = await prisma.product.findMany({
      where: { sku: { in: orderedSkus } }
    });

    // Get organization info
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: { organization: true }
    });

    if (!store || !store.organization) {
      return NextResponse.json(
        { error: 'Store or organization not found' },
        { status: 404 }
      );
    }

    const org = store.organization;

    // Calculate totals
    let totalBoxes = 0;
    let totalCost = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;

    const orderItems = products.map(p => {
      const qty = boxQuantities[p.sku] || 0;
      const boxPrice = Number(p.price);
      const wholesalePrice = Number(p.wholesalePrice || 0);
      const retailPrice = Number(p.retailPrice || 0);
      const unitsPerBox = p.unitsPerBox || 1;
      const itemTotal = boxPrice * qty;
      const itemRetailValue = retailPrice * unitsPerBox * qty;
      const margin = retailPrice > 0 ? ((retailPrice - wholesalePrice) / retailPrice * 100).toFixed(0) : 0;

      totalBoxes += qty;
      totalCost += itemTotal;
      totalRetailValue += itemRetailValue;
      totalUnits += unitsPerBox * qty;

      return {
        product: p,
        qty,
        boxPrice,
        wholesalePrice,
        retailPrice,
        unitsPerBox,
        itemTotal,
        itemRetailValue,
        margin
      };
    });

    // Send email to brand
    const emailSubject = `� Wholesale Order Request from ${storeName}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #7c3aed;">New Wholesale Order Request</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Store Information</h3>
          <p><strong>Store:</strong> ${storeName}</p>
          <p><strong>Store ID:</strong> ${storeId}</p>
          <p><strong>Contact:</strong> ${contactName || 'N/A'}</p>
          <p><strong>Email:</strong> ${contactEmail || 'N/A'}</p>
          <p><strong>Phone:</strong> ${contactPhone || 'N/A'}</p>
        </div>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #d1fae5;">
                <th style="text-align: left; padding: 8px;">Product</th>
                <th style="text-align: center; padding: 8px;">Qty</th>
                <th style="text-align: right; padding: 8px;">Box Price</th>
                <th style="text-align: right; padding: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems.map(item => `
                <tr style="border-bottom: 1px solid #d1fae5;">
                  <td style="padding: 12px 8px;">
                    <strong>${item.product.name}</strong>
                    <br/>
                    <small style="color: #6b7280;">${item.product.description || ''}</small>
                    <br/>
                    <small style="color: #059669;">${item.unitsPerBox} units/box • ${item.margin}% margin</small>
                  </td>
                  <td style="text-align: center; padding: 12px 8px;">
                    <strong>${item.qty}</strong> boxes
                  </td>
                  <td style="text-align: right; padding: 12px 8px;">
                    $${item.boxPrice.toFixed(2)}
                  </td>
                  <td style="text-align: right; padding: 12px 8px;">
                    <strong>$${item.itemTotal.toFixed(2)}</strong>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #d1fae5;">
                <td colspan="3" style="padding: 12px 8px; text-align: right;"><strong>Subtotal (${totalBoxes} boxes, ${totalUnits} units):</strong></td>
                <td style="text-align: right; padding: 12px 8px;"><strong style="color: #059669; font-size: 18px;">$${totalCost.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${notes ? `
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2563eb;">Additional Notes</h3>
            <p style="white-space: pre-wrap;">${notes}</p>
          </div>
        ` : ''}

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Please contact the store directly to confirm the order, provide shipping details, and arrange payment.
        </p>
      </div>
    `;

    try {
      if (org.supportEmail) {
        await resend.emails.send({
          from: 'QRDisplay <noreply@qrdisplay.com>',
          to: org.supportEmail,
          subject: emailSubject,
          html: emailBody
        });
        console.log('✅ Purchase request email sent to:', org.supportEmail);
      }
    } catch (emailErr) {
      console.error('❌ Failed to send purchase request email:', emailErr);
    }

    // TODO: Add SMS notification support when Twilio is set up
    // For now, just log that we would send an SMS
    if (org.supportPhone) {
      console.log('📱 Would send SMS to:', org.supportPhone, '(SMS not configured yet)');
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase request sent successfully'
    });
  } catch (error) {
    console.error('Purchase request error:', error);
    return NextResponse.json(
      { error: 'Failed to send purchase request' },
      { status: 500 }
    );
  }
}
