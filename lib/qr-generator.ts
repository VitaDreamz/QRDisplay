import QRCode from 'qrcode';

/**
 * Generate a QR code with the SampleHound logo embedded in the center
 * Uses high error correction (H = ~30% recovery) so logo doesn't break scanning
 * 
 * NOTE: Logo embedding requires the 'canvas' package which is large and may not work
 * in serverless environments. This function falls back to simple QR if canvas isn't available.
 */
export async function generateQRWithLogo(url: string, options?: {
  size?: number;
  logoPath?: string;
  logoSize?: number;
}): Promise<string> {
  // Try to use canvas for logo embedding, fall back to simple QR if not available
  try {
    // Dynamic import to avoid issues in serverless environments
    const { createCanvas, loadImage } = await import('canvas');
    const path = await import('path');
    const fs = await import('fs');
    
    const size = options?.size || 400;
    const logoSize = options?.logoSize || Math.floor(size * 0.25);
    const logoPath = options?.logoPath || path.join(process.cwd(), 'public/images/Logos/SampleHoundLogo.png');
    
    // Generate base QR code
    const qrCanvas = createCanvas(size, size);
    await QRCode.toCanvas(qrCanvas, url, {
      errorCorrectionLevel: 'H',
      width: size,
      margin: 1,
      color: {
        dark: '#1f2937',
        light: '#ffffff'
      }
    });
    
    const ctx = qrCanvas.getContext('2d');
    
    // Add white circle background for logo
    const centerX = size / 2;
    const centerY = size / 2;
    const circleRadius = logoSize / 2 + 8;
    
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
      }
    }
    
    return qrCanvas.toDataURL('image/png');
  } catch (error) {
    // Canvas not available or failed - fall back to simple QR
    console.log('Canvas not available, using simple QR code');
    return generateSimpleQR(url, options?.size);
  }
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
