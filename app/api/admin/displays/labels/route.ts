import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import prisma from '@/lib/prisma';

// OL854 CORRECT specifications (5 columns × 7 rows)
const PAGE_WIDTH = 215.9;     // 8.5"
const PAGE_HEIGHT = 279.4;    // 11"
const COLS = 5;               // 5 columns (NOT 7!)
const ROWS = 7;               // 7 rows (NOT 5!)
const LABELS_PER_PAGE = 35;   // 5 × 7 = 35

// Label dimensions (inches to mm)
const LABEL_WIDTH = 31.75;    // 1.25"
const LABEL_HEIGHT = 31.75;   // 1.25"

// Margins (inches to mm)
const LEFT_MARGIN = 22.225;   // 0.875"
const TOP_MARGIN = 19.05;     // 0.75"

// Pitch (center-to-center spacing, inches to mm)
const COL_PITCH = 34.925;     // 1.375"
const ROW_PITCH = 34.925;     // 1.375"

// Corner radius
const CORNER_RADIUS = 3.175;  // 0.125"

export async function POST(request: NextRequest) {
  try {
    const { displayIds } = await request.json();
    
    if (!displayIds || !Array.isArray(displayIds) || displayIds.length === 0) {
      return NextResponse.json({ error: 'Invalid display IDs' }, { status: 400 });
    }
    
    // Get displays with QR codes
    const displays = await prisma.display.findMany({
      where: { displayId: { in: displayIds } },
      orderBy: { displayId: 'asc' }
    });
    
    if (displays.length === 0) {
      return NextResponse.json({ error: 'No displays found' }, { status: 404 });
    }
    
  const doc = new jsPDF({
    unit: 'mm',
    format: 'letter',
    orientation: 'portrait'
  });    let labelIndex = 0;
    
    for (const display of displays) {
      if (!display.qrPngUrl) continue;
      
      // Calculate position on sheet (5 columns × 7 rows)
      const page = Math.floor(labelIndex / LABELS_PER_PAGE);
      const posOnPage = labelIndex % LABELS_PER_PAGE;
      const col = posOnPage % COLS;  // 5 columns
      const row = Math.floor(posOnPage / COLS);  // 7 rows
      
      // Add new page if needed
      if (page > 0 && posOnPage === 0) {
        doc.addPage();
      }
      
      // Calculate label position (using pitch for center-to-center)
      const x = LEFT_MARGIN + (col * COL_PITCH);
      const y = TOP_MARGIN + (row * ROW_PITCH);
      
          // QR Code (0.9" = 22.86mm, centered)
    const qrSize = 22.86;
    const qrX = x + (LABEL_WIDTH - qrSize) / 2;
    const qrY = y + 1.5;
      
      doc.addImage(display.qrPngUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      
          // Short URL (6pt, gray)
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'qrdisplay.com/d/',
      x + LABEL_WIDTH / 2,
      qrY + qrSize + 2.5,
      { align: 'center' }
    );
    
    // Display ID (8pt, bold, black)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(
      display.displayId,
      x + LABEL_WIDTH / 2,
      qrY + qrSize + 5.5,
      { align: 'center' }
    );
      
      labelIndex++;
    }
    
    // Return PDF as arraybuffer
    const pdfBlob = doc.output('arraybuffer');
    
    return new Response(pdfBlob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-labels-OL854-${displays.length}.pdf"`
    }
  });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
