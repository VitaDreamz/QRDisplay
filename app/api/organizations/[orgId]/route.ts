import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const organization = await prisma.organization.findUnique({
      where: { orgId },
      select: {
        id: true,
        orgId: true,
        name: true,
        logoUrl: true,
        supportEmail: true,
        supportPhone: true,
        customerServiceEmail: true,
        customerServicePhone: true,
        websiteUrl: true,
        // These fields might have been filled in by sales rep during onboarding
        // We'll use them to pre-fill the store setup wizard
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('[API] Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}
