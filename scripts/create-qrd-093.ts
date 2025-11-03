import prisma from '../lib/prisma';
import QRCode from 'qrcode';

async function createOrUpdateDisplay() {
  try {
    const displayId = 'QRD-093';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const shortUrl = `${baseUrl}/d/${displayId}`;

    // Generate QR code
    const qrPngUrl = await QRCode.toDataURL(shortUrl, {
      width: 400,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#4a4a4a',
        light: '#ffffff'
      }
    });

    // Check if display exists
    const existing = await prisma.display.findUnique({
      where: { displayId }
    });

    let display;
    if (existing) {
      // Update existing display
      display = await prisma.display.update({
        where: { displayId },
        data: {
          qrPngUrl,
          targetUrl: shortUrl,
          status: 'inventory',
          ownerOrgId: 'ORG-VITADREAMZ',
          storeId: null,
          activatedAt: null
        }
      });
      console.log('✅ Display updated to inventory status:');
    } else {
      // Create new display
      display = await prisma.display.create({
        data: {
          displayId,
          qrPngUrl,
          targetUrl: shortUrl,
          status: 'inventory',
          ownerOrgId: 'ORG-VITADREAMZ'
        }
      });
      console.log('✅ Display created successfully:');
    }

    console.log(JSON.stringify(display, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOrUpdateDisplay();
