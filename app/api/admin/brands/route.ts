import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRoleForApi } from "@/lib/rbac";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  try {
    // For now, allow unauthenticated access to list brands
    // TODO: Re-enable auth once Clerk is properly configured
    // const auth = await requireRoleForApi(req, { require: "org-admin" });
    // if (!auth.ok) {
    //   console.error("Auth failed:", auth.message, auth.status);
    //   return NextResponse.json({ error: auth.message }, { status: auth.status });
    // }

    const brands = await prisma.organization.findMany({
      where: {
        type: 'client',
      },
      select: {
        id: true,
        orgId: true,
        name: true,
        slug: true,
        logoUrl: true,
        type: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ brands });
  } catch (err) {
    console.error("Error fetching brands:", err);
    return NextResponse.json(
      { error: "Failed to fetch brands", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // Ensure user is super-admin
  const auth = await requireRoleForApi(req, { require: "super-admin" });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { 
      name, 
      slug,
      logoUrl,
      adminEmail, 
      adminName,
      adminPhone,
      supportEmail,
      supportPhone,
      emailFromName,
      emailFromAddress,
      emailReplyTo,
      websiteUrl,
    } = await req.json();

    // Validate required fields
    if (!name || !slug || !adminEmail || !adminName || !adminPhone || !supportEmail || !emailFromName || !emailFromAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if organization with slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 400 }
      );
    }

    // Generate unique orgId
    const orgId = `ORG-${nanoid(8)}`.toUpperCase();

    // Create organization with public support settings
    const org = (await prisma.organization.create({
      data: {
        orgId,
        name,
        slug,
        type: "client",
        logoUrl: logoUrl || null,
        supportEmail,
        supportPhone: supportPhone || null,
        emailFromName,
        emailFromAddress,
        emailReplyTo: emailReplyTo || supportEmail, // Default to supportEmail if not provided
        websiteUrl: websiteUrl || null,
      },
    })) as any;

    // Create admin user for organization
    // Note: User will be properly linked once they accept invite and sign up
    await prisma.user.create({
      data: {
        userId: `PENDING-${nanoid(12)}`,
        email: adminEmail,
        name: adminName,
        phone: adminPhone,
        role: "org-admin",
        orgId: org.orgId,
      } as any,
    });

    // TODO: Send invitation email to admin
    // We'll implement this in the next step

    return NextResponse.json(org);
  } catch (err) {
    console.error("Error creating brand:", err);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}