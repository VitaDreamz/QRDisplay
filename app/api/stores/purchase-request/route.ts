import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeName, productSkus, notes, contactName, contactEmail, contactPhone } = body;

    if (!storeId || !productSkus || productSkus.length === 0) {
      return NextResponse.json(
        { error: 'Store ID and at least one product are required' },
        { status: 400 }
      );
    }

    // Get product details
    const products = await prisma.product.findMany({
      where: { sku: { in: productSkus } }
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

    // Prepare product list for email/SMS
    const productList = products.map(p => `• ${p.name} - $${Number(p.price).toFixed(2)}`).join('\n');

    // Send email to brand
    const emailSubject = `🛒 Purchase Request from ${storeName}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #7c3aed;">New Purchase Request</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Store Information</h3>
          <p><strong>Store:</strong> ${storeName}</p>
          <p><strong>Store ID:</strong> ${storeId}</p>
          <p><strong>Contact:</strong> ${contactName || 'N/A'}</p>
          <p><strong>Email:</strong> ${contactEmail || 'N/A'}</p>
          <p><strong>Phone:</strong> ${contactPhone || 'N/A'}</p>
        </div>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">Requested Products (${products.length})</h3>
          <ul style="list-style: none; padding: 0;">
            ${products.map(p => `
              <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                <strong>${p.name}</strong> - $${Number(p.price).toFixed(2)}
                <br/>
                <small style="color: #6b7280;">${p.description || ''}</small>
              </li>
            `).join('')}
          </ul>
        </div>

        ${notes ? `
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2563eb;">Additional Notes</h3>
            <p style="white-space: pre-wrap;">${notes}</p>
          </div>
        ` : ''}

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Please contact the store directly to discuss pricing, quantities, and shipping.
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
