import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, reason, storeId } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    // Upsert opt-out by phone (assumes phone stored in E.164 format in DB)
    const record = await prisma.optOut.upsert({
      where: { phone },
      create: { phone, reason: reason || 'opt_out' },
      update: { reason: reason || 'opt_out' }
    });

    // Update customer status to "opted_out" if they exist
    try {
      const whereClause: any = { phone };
      if (storeId) {
        whereClause.storeId = storeId;
      }
      
      await prisma.customer.updateMany({
        where: whereClause,
        data: {
          currentStage: 'opted_out',
          stageChangedAt: new Date()
        }
      });
    } catch (e) {
      console.warn('Failed to update customer status to opted_out:', e);
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error('[OptOut API] POST error:', error);
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}
