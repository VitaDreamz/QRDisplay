import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import prisma from '@/lib/prisma';

/**
 * QR LABEL GENERATOR - OnlineLabels.com OL2681WI Template
 * 
 * EXACT SPECIFICATIONS (as of 2025-11-14):
 * - 24 labels per sheet (4 columns × 6 rows)
 * - Label size: 1.5" × 1.5" (38.1mm × 38.1mm)
 * - Top/Bottom margins: 0.5" (12.7mm)
 * - Left/Right margins: 0.7812" (19.84375mm)
 * - Horizontal spacing: 0.3125" (7.9375mm)
 * - Vertical spacing: 0.2" (5.08mm)
 * - Horizontal pitch: 1.8125" (46.04375mm)
 * - Vertical pitch: 1.7" (43.18mm)
 * - Corner radius: 0.03125" (0.79375mm)
 * 
 * TROUBLESHOOTING:
 * If labels are misaligned on physical sheet:
 * 
 * 1. LABELS TOO FAR LEFT/RIGHT:
 *    - Adjust: LEFT_MARGIN (currently 19.84375mm)
 *    - Or adjust: COL_PITCH (currently 46.04375mm)
 * 
 * 2. LABELS TOO HIGH/LOW:
 *    - Adjust: TOP_MARGIN (currently 12.7mm)
 *    - Or adjust: ROW_PITCH (currently 43.18mm)
 * 
 * 3. QR CODE POSITION WITHIN LABEL:
 *    - Move QR up/down: QR_TOP_PADDING (currently 2mm)
 *    - Move QR left/right: QR_SIDE_PADDING (currently 6.05mm)
 *    - Resize QR: QR_SIZE (currently 26mm)
 * 
 * 4. TEXT POSITION:
 *    - URL closer/farther from QR: URL_OFFSET (currently 1.5mm)
 *    - ID closer/farther from URL: ID_OFFSET (currently 2.5mm)
 * 
 * All measurements in millimeters (mm). 1 inch = 25.4mm
 */

// OL2681WI EXACT SPECIFICATIONS (OnlineLabels.com)
// 4 columns × 6 rows = 24 labels per sheet
const PAGE_WIDTH = 215.9;     // 8.5" standard letter
const PAGE_HEIGHT = 279.4;    // 11" standard letter
const COLS = 4;               // 4 columns (across)
const ROWS = 6;               // 6 rows (down)
const LABELS_PER_PAGE = 24;   // 4 × 6 = 24

// Label dimensions - EXACT from OnlineLabels spec
const LABEL_WIDTH = 38.1;     // 1.5" = 38.1mm
const LABEL_HEIGHT = 38.1;    // 1.5" = 38.1mm

// Margins - EXACT from OnlineLabels spec
const LEFT_MARGIN = 19.84375; // 0.7812" = 19.84375mm
const RIGHT_MARGIN = 19.84375;// 0.7812" = 19.84375mm
const TOP_MARGIN = 12.7;      // 0.5" = 12.7mm
const BOTTOM_MARGIN = 12.7;   // 0.5" = 12.7mm

// Spacing - EXACT from OnlineLabels spec
const HORIZONTAL_SPACING = 7.9375; // 0.3125" = 7.9375mm
const VERTICAL_SPACING = 5.08;     // 0.2" = 5.08mm

// Pitch (center-to-center) - EXACT from OnlineLabels spec
const COL_PITCH = 46.04375;   // 1.8125" = 46.04375mm (Horizontal Pitch)
const ROW_PITCH = 43.18;      // 1.7" = 43.18mm (Vertical Pitch)

// Corner radius
const CORNER_RADIUS = 0.79375;// 0.03125" = 0.79375mm

// QR Code sizing - OPTIMIZED FOR 1.5" × 1.5" LABELS
const QR_SIZE = 28;           // 28mm QR code (slightly larger for better scanning)
const QR_TOP_PADDING = 2.5;   // 2.5mm from top of label to QR (looks good, keeping as-is)
const QR_BOTTOM_PADDING = 2.5;// 2.5mm space at bottom (match top for balance)
const QR_SIDE_PADDING = 5.05; // Center horizontally: (38.1 - 28) / 2 = 5.05mm

// Text sizing
const URL_FONT_SIZE = 6.5;    // 6.5pt for URL (smaller to fit)
const ID_FONT_SIZE = 8;       // 8pt for Display ID

// Text spacing (all relative to QR code bottom)
const URL_OFFSET = 2.5;       // Space between QR bottom and URL text (more breathing room)
const ID_OFFSET = 2.2;        // Space between URL and ID text

// Calculate max text height to ensure it fits
// Total available space below QR: 38.1 - (2.5 + 26) = 9.6mm
// Need to fit: URL (6.5pt ≈ 2.3mm) + spacing (1.2mm) + ID (8pt ≈ 2.8mm) + spacing (2.2mm) + bottom padding (2mm) = 10.5mm
// Note: If text overflows, reduce font sizes or increase QR_TOP_PADDING

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
      
      // Short URL (6.5pt, gray, centered below QR)
      doc.setFontSize(URL_FONT_SIZE);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'qrdisplay.com/d/',
        x + LABEL_WIDTH / 2,
        qrY + QR_SIZE + URL_OFFSET,
        { align: 'center' }
      );
      
      // Display ID (8pt, bold, black, centered below short URL)
      doc.setFontSize(ID_FONT_SIZE);
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
