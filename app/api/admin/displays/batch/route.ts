import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

function generateDisplayId(count: number): string {
  const num = count + 1;
  const padded = String(num).padStart(3, '0'); // Minimum 3 digits
  return `QRD-${padded}`;
}

export async function POST(request: NextRequest) {
  try {
    const { quantity } = await request.json();
    
    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }
    
    // Resolve VitaDreamz organization (do not create a new one)
    const vitaDreamz = await prisma.organization.findFirst({
      where: {
        OR: [
          { orgId: 'ORG-VITADREAMZ' },
          { slug: 'vitadreamz' },
          { name: { equals: 'VitaDreamz', mode: 'insensitive' } },
        ],
      },
      select: { id: true, orgId: true, name: true },
    });
    
    if (!vitaDreamz) {
      return NextResponse.json(
        { 
          error: 'VitaDreamz organization not found. Please create it first at /admin/brands/new',
        },
        { status: 400 }
      );
    }
    
    // Get current count
    const count = await prisma.display.count();
    
    // Create display records
    const displays = [];
    for (let i = 0; i < quantity; i++) {
      const displayId = generateDisplayId(count + i);
      
      // Generate QR code with short URL
      const url = `https://qrdisplay.com/d/${displayId}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 400,
        margin: 1,
        color: {
          dark: '#1f2937',  // Dark gray (better for printing)
          light: '#ffffff'
        }
      });
      
      displays.push({
        displayId,
        ownerOrgId: 'ORG-QRDISPLAY',
        // Single-brand MVP: default all new displays as sold to VitaDreamz
        status: 'sold',
        assignedOrgId: vitaDreamz.id, // Use CUID, not orgId string
        qrPngUrl: qrDataUrl,
        targetUrl: url,
        createdAt: new Date()
      });
    }
    
    // Bulk create
    await prisma.display.createMany({ data: displays });
    
    return NextResponse.json({
      success: true,
      created: quantity,
      displays: displays.map(d => ({ 
        displayId: d.displayId, 
        url: d.targetUrl 
      }))
    });
  } catch (error) {
    console.error('Batch creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
