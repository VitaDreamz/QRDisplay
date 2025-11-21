import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partnershipId = params.id;
    const body = await req.json();
    const { availableSamples, availableProducts } = body;

    // Verify the partnership belongs to this user's store
    const partnership = await prisma.storeBrandPartnership.findUnique({
      where: { id: partnershipId },
      include: {
        store: {
          include: {
            users: true
          }
        }
      }
    });

    if (!partnership) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }

    // Check if user has access to this store
    const hasAccess = partnership.store.users.some((u: any) => u.email === session.user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the partnership
    const updateData: any = {};
    if (availableSamples !== undefined && Array.isArray(availableSamples)) {
      updateData.availableSamples = availableSamples;
    }
    if (availableProducts !== undefined && Array.isArray(availableProducts)) {
      updateData.availableProducts = availableProducts;
    }

    const updated = await prisma.storeBrandPartnership.update({
      where: { id: partnershipId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating partnership:', error);
    return NextResponse.json(
      { error: 'Failed to update partnership' },
      { status: 500 }
    );
  }
}
