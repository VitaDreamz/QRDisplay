import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const formData = await req.formData();
    const enteredPin = String(formData.get('pin') || '');

    // Find staff by token
    const staff = await prisma.staff.findFirst({
      where: { verificationToken: token },
      include: { store: true }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Check expiry
    if (staff.verificationExpiry && staff.verificationExpiry < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    // Verify PIN
    if (enteredPin !== staff.staffPin) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 400 });
    }

    // Mark as verified and activate
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        status: 'active',
        verificationToken: null,
        verificationExpiry: null
      }
    });

    // Redirect to login page with success message
    const url = new URL(`/store/login/${staff.store.storeId}?verified=1&staffId=${staff.staffId}`, req.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
