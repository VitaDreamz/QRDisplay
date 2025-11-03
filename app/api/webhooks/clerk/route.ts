import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

// Clerk webhook handler to sync users into our database.
// Note: For production you MUST verify the webhook signature using
// Clerk's webhook secret. This implementation is permissive for local
// development; add verification before deploying.

export async function POST(req: Request) {
  try {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET || process.env.CLERK_WEBHOOK_SECRET;
    if (!signingSecret) {
      console.error("Missing CLERK_WEBHOOK_SIGNING_SECRET or CLERK_WEBHOOK_SECRET in environment");
      return NextResponse.json({ ok: false, error: "missing webhook signing secret" }, { status: 500 });
    }

    // Verify webhook signature. This will throw if verification fails.
    try {
      // verifyWebhook accepts several request shapes; cast to any to satisfy TS in this route
      await verifyWebhook(req as any, { signingSecret });
    } catch (verr) {
      console.error("Webhook signature verification failed:", verr);
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }

    const body = await req.json();

    // Try to extract event type and user payload in a few common shapes
    const eventType = body.type || body.event || (body.events && body.events[0]?.type) || null;

    // Clerk user object might be in body.data or body.data.user or body.data.users[0]
    const userPayload =
      body.data || body.data?.user || (body.data?.users && body.data.users[0]) || body;

    const clerkId = userPayload?.id || userPayload?.user_id || userPayload?.userId;
    const email =
      userPayload?.primary_email_address?.email_address ||
      (userPayload?.email_addresses && userPayload.email_addresses[0]?.email_address) ||
      userPayload?.email ||
      null;

    const firstName = userPayload?.first_name || userPayload?.firstName || userPayload?.given_name || "";
    const lastName = userPayload?.last_name || userPayload?.lastName || userPayload?.family_name || "";
    const name = (userPayload?.name as string) || `${firstName} ${lastName}`.trim() || null;

    const publicMetadata = userPayload?.public_metadata || userPayload?.publicMetadata || {};
    const requestedOrgId = publicMetadata?.orgId || publicMetadata?.organizationId || null;
    const requestedRole = publicMetadata?.role || publicMetadata?.roleName || null;

    // Quick guard
    if (!clerkId || !email) {
      return NextResponse.json({ ok: false, reason: "missing clerk id or email" }, { status: 400 });
    }

    // Special-case: make the project owner a super-admin
    const superAdminEmail = "jbonutto@gmail.com";

    let role = requestedRole || "org-admin";
    let orgId = requestedOrgId || null;
    if (email === superAdminEmail) {
      orgId = "ORG-QRDISPLAY";
      role = "super-admin";
    }

    // Ensure organization exists if orgId provided
    if (orgId) {
      const existingOrg = await prisma.organization.findUnique({ where: { orgId } });
      if (!existingOrg) {
        // Create a placeholder org entry so FK constraints pass
        await prisma.organization.create({
          data: {
            orgId,
            name: publicMetadata?.orgName || `Org ${orgId}`,
            slug: (publicMetadata?.slug as string) || orgId.toLowerCase(),
            type: "client",
          },
        });
      }
    }

    // Upsert user by email (if existing) or create
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          userId: clerkId,
          name: name || existing.name,
          role,
          orgId: orgId || existing.orgId,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          userId: clerkId,
          orgId: orgId || "",
          email,
          name,
          role,
        },
      });
    }

    return NextResponse.json({ ok: true, eventType });
  } catch (err) {
    console.error("Clerk webhook error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
