# QR Label Layout - OL2681 Template

## Template Specifications
- **Product**: OnlineLabels OL2681
- **Labels Per Sheet**: 24 (6 columns × 4 rows)
- **Label Size**: 1.5" × 1.5" square (38.1mm × 38.1mm)
- **Sheet Size**: 8.5" × 11" (US Letter)
- **Corner Radius**: 0.03125" (0.794mm)

## Page Layout
```
Top Margin: 0.5" (12.7mm)
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Left: 0.7812" (19.84mm)                                │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┐                 │
│  │  1  │  2  │  3  │  4  │  5  │  6  │  ← Row 1        │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤                 │
│  │  7  │  8  │  9  │ 10  │ 11  │ 12  │  ← Row 2        │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤                 │
│  │ 13  │ 14  │ 15  │ 16  │ 17  │ 18  │  ← Row 3        │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤                 │
│  │ 19  │ 20  │ 21  │ 22  │ 23  │ 24  │  ← Row 4        │
│  └─────┴─────┴─────┴─────┴─────┴─────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Pitch (Center-to-Center Spacing)
- **Horizontal Pitch**: 1.8125" (46.04mm)
- **Vertical Pitch**: 1.7" (43.18mm)

## Individual Label Layout (1.5" × 1.5")
```
┌─────────────────────────────────────┐
│ ← 3mm →                  ← 3mm →    │ ← Equal side padding
│    ┌───────────────────────────┐    │
│ ↑  │                           │    │
│ 3mm│                           │    │ ← Top padding (equal to sides)
│ ↓  │                           │    │
│    │       QR CODE (32mm)      │    │
│    │                           │    │
│    │                           │    │
│    │                           │    │
│    └───────────────────────────┘    │
│                                     │
│       qrdisplay.com/d/              │ ← 7pt gray
│          QRD-XXX                    │ ← 9pt bold black
│                                     │
│ ↑                                   │
│ 8mm                                 │ ← Bottom padding (for text)
│ ↓                                   │
└─────────────────────────────────────┘
    1.5" × 1.5" (38.1mm × 38.1mm)
```

## Symmetrical Padding Design
The layout uses **equal padding on three sides** for visual balance:
- **Top**: 3mm (same as sides)
- **Left**: 3mm (equal margin)
- **Right**: 3mm (equal margin)
- **Bottom**: 8mm (extra space for text)

This creates a **visually centered** QR code with the shortlink text neatly positioned below.

## Measurements
- **Label Dimensions**: 38.1mm × 38.1mm
- **QR Code Size**: 32mm × 32mm
- **QR Code Position**: 
  - X: Label X + 3mm (left padding)
  - Y: Label Y + 3mm (top padding)
- **Text Position**: 
  - Centered horizontally within label
  - Short URL: QR bottom + 3mm
  - Display ID: Short URL + 3.5mm

## Total Padding Breakdown
- Available label space: 38.1mm × 38.1mm
- QR code: 32mm × 32mm
- Left margin: 3mm
- Right margin: 3mm (38.1 - 32 - 3 = 3.1mm, effectively 3mm)
- Top margin: 3mm
- Bottom margin: 3.1mm + 8mm text area = ~11mm total

## Font Specifications
- **Short URL**: 7pt, Gray (RGB: 100, 100, 100), Helvetica Regular
- **Display ID**: 9pt, Black, Helvetica Bold

## File Locations
- **API Route**: `/app/api/admin/displays/labels/route.ts`
- **Frontend**: `/app/admin/dashboard/InventoryTab.tsx`

## Testing Instructions
1. Start local dev server: `npm run dev`
2. Navigate to `/admin/dashboard`
3. Go to Inventory tab
4. Select displays to print
5. Click "Generate QR Labels (PDF)"
6. Print PDF on OL2681 label sheets
7. Verify alignment with physical labels

## Alignment Verification
- QR codes should be **centered horizontally** on each label
- Equal white space on **top, left, and right** sides
- More space at **bottom** for text
- Text should be **centered** and **readable**
- Labels should align perfectly with OL2681 die-cut borders
