import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

/**
 * Generate a QR code with the SampleHound logo embedded in the center
 * Uses high error correction (H = ~30% recovery) so logo doesn't break scanning
 */
export async function generateQRWithLogo(url: string, options?: {
  size?: number;
  logoPath?: string;
  logoSize?: number;
}): Promise<string> {
  const size = options?.size || 400;
  const logoSize = options?.logoSize || Math.floor(size * 0.25); // Logo takes ~25% of QR code
  
  // Default to SampleHound simple logo (works better in QR codes than the QR version)
  const logoPath = options?.logoPath || path.join(process.cwd(), 'public/images/Logos/SampleHoundLogo.svg');
  
  // Generate base QR code with high error correction
  const qrCanvas = createCanvas(size, size);
  await QRCode.toCanvas(qrCanvas, url, {
    errorCorrectionLevel: 'H', // High error correction (30% recovery)
    width: size,
    margin: 1,
    color: {
      dark: '#1f2937',  // Dark gray
      light: '#ffffff'  // White
    }
  });
  
  const ctx = qrCanvas.getContext('2d');
  
  // Add white circle background for logo
  const centerX = size / 2;
  const centerY = size / 2;
  const circleRadius = logoSize / 2 + 8; // 8px padding around logo
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Load and draw logo if file exists
  if (fs.existsSync(logoPath)) {
    try {
      const logo = await loadImage(logoPath);
      const logoX = centerX - logoSize / 2;
      const logoY = centerY - logoSize / 2;
      
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    } catch (error) {
      console.error('Error loading logo:', error);
      // QR code still works without logo
    }
  }
  
  // Convert canvas to data URL
  return qrCanvas.toDataURL('image/png');
}

/**
 * Generate a simple QR code without logo (fallback for environments without canvas)
 */
export async function generateSimpleQR(url: string, size: number = 400): Promise<string> {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: size,
    margin: 1,
    color: {
      dark: '#1f2937',
      light: '#ffffff'
    }
  });
}
