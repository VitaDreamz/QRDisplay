import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import prisma from '@/lib/prisma';

/**
 * LABEL ADJUSTMENT GUIDE:
 * 
 * If labels are misaligned on physical sheet:
 * 
 * 1. QR TOO BIG/SMALL:
 *    - Adjust: QR_SIZE (currently 24mm)
 * 
 * 2. LABELS TOO FAR LEFT/RIGHT:
 *    - Adjust: LEFT_MARGIN (currently 19.84mm)
 *    - Or adjust: COL_PITCH (currently 46.04mm)
 * 
 * 3. LABELS TOO HIGH/LOW:
 *    - Adjust: TOP_MARGIN (currently 12.7mm)
 *    - Or adjust: ROW_PITCH (currently 43.18mm)
 * 
 * 4. QR CODE POSITION WITHIN LABEL:
 *    - Move QR up/down: QR_TOP_PADDING (currently 3mm)
 *    - Move QR left/right: QR_SIDE_PADDING (currently 7.05mm)
 * 
 * 5. TEXT POSITION:
 *    - URL closer/farther from QR: URL_OFFSET (currently 2mm)
 *    - ID closer/farther from URL: ID_OFFSET (currently 2.5mm)
 * 
 * All measurements in millimeters (mm)
 */

// OL2681 specifications (4 columns × 6 rows)
const PAGE_WIDTH = 215.9;     // 8.5"
const PAGE_HEIGHT = 279.4;    // 11"
const COLS = 4;               // 4 columns (across)
const ROWS = 6;               // 6 rows (down)
const LABELS_PER_PAGE = 24;   // 4 × 6 = 24

// Label dimensions (inches to mm)
const LABEL_WIDTH = 38.1;     // 1.5"
const LABEL_HEIGHT = 38.1;    // 1.5"

// Margins (inches to mm)
const LEFT_MARGIN = 19.84;    // 0.7812"
const TOP_MARGIN = 12.7;      // 0.5"

// Pitch (center-to-center spacing, inches to mm)
const COL_PITCH = 46.04;      // 1.8125"
const ROW_PITCH = 43.18;      // 1.7"

// QR Code sizing - ADJUSTED TO FIT BETTER
const QR_SIZE = 24;           // Reduced to 24mm (4mm less than original 28mm)
const QR_TOP_PADDING = 3;     // Space from top of label to QR
const QR_SIDE_PADDING = 7.05; // Center horizontally: (38.1 - 24) / 2 = 7.05mm

// Text spacing (all relative to QR code bottom)
const URL_OFFSET = 2;         // Space between QR bottom and URL text
const ID_OFFSET = 2.5;        // Space between URL and ID text

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
      
      // Calculate position on sheet (4 columns × 6 rows)
      const page = Math.floor(labelIndex / LABELS_PER_PAGE);
      const posOnPage = labelIndex % LABELS_PER_PAGE;
      const col = posOnPage % COLS;  // 4 columns (across)
      const row = Math.floor(posOnPage / COLS);  // 6 rows (down)
      
      // Add new page if needed
      if (page > 0 && posOnPage === 0) {
        doc.addPage();
      }
      
      // Calculate label position (using pitch for center-to-center)
      const x = LEFT_MARGIN + (col * COL_PITCH);
      const y = TOP_MARGIN + (row * ROW_PITCH);
      
      // QR Code positioned with padding
      const qrX = x + QR_SIDE_PADDING;
      const qrY = y + QR_TOP_PADDING;
      
      doc.addImage(display.qrPngUrl, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);
      
      // Short URL (7pt, gray, centered below QR)
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'qrdisplay.com/d/',
        x + LABEL_WIDTH / 2,
        qrY + QR_SIZE + URL_OFFSET,
        { align: 'center' }
      );
      
      // Display ID (9pt, bold, black, centered below short URL)
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(
        display.displayId,
        x + LABEL_WIDTH / 2,
        qrY + QR_SIZE + URL_OFFSET + ID_OFFSET,
        { align: 'center' }
      );
      
      labelIndex++;
    }
    
    // Save print history
    const sheets = Math.ceil(displays.length / LABELS_PER_PAGE);
    const batchId = `BATCH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(await prisma.labelPrintHistory.count() + 1).padStart(3, '0')}`;
    
    await prisma.labelPrintHistory.create({
      data: {
        batchId,
        displayIds: displays.map(d => d.displayId),
        quantity: displays.length,
        sheets,
        printedAt: new Date(),
      }
    });
    
    // Return PDF as arraybuffer
    const pdfBlob = doc.output('arraybuffer');
    
    return new Response(pdfBlob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-labels-OL2681-${displays.length}.pdf"`
    }
  });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
