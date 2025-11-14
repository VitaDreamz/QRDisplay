import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const history = await prisma.labelPrintHistory.findMany({
      orderBy: { printedAt: 'desc' },
      take: 50, // Last 50 print jobs
    });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Failed to fetch print history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
