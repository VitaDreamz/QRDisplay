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
    const logoSize = options?.logoSize || Math.floor(size * 0.4); // Back to 40%
    const logoPath = options?.logoPath || path.join(process.cwd(), 'public/images/Logos/SampleHoundLogo.png');
    
    // Generate base QR code
    const qrCanvas = createCanvas(size, size);
    await QRCode.toCanvas(qrCanvas, url, {
      errorCorrectionLevel: 'H',
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const ctx = qrCanvas.getContext('2d');
    
    // Load and draw logo
    const logo = await loadImage(logoPath);
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    
    // Draw white background circle for logo
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoSize / 2 + 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw logo
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    
    // Convert to data URL
    return qrCanvas.toDataURL('image/png');
    
  } catch (error) {
    console.warn('Canvas not available or error generating QR with logo, falling back to simple QR:', error);
    return generateSimpleQR(url, options?.size);
  }
}

/**
 * Generate a simple QR code without logo (fallback)
 */
export async function generateSimpleQR(url: string, size?: number): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: size || 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}
