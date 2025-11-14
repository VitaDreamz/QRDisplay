import prisma from "./prisma";
type DbUser = any;

import { auth } from "@clerk/nextjs/server";
// Clerk server helpers - import from server entrypoint
// These functions may run in several environments (API route, server component,
// or middleware). We'll try multiple Clerk helpers to obtain the logged-in user id.
async function getClerkUserIdFromClerk(): Promise<string | null> {
  try {
    // auth() works in server components and route handlers (App Router)
    const { userId } = await auth();
    return userId ?? null;
  } catch (e) {
    console.error("Clerk auth error:", e);
    return null;
  }
}

export async function getClerkUserId(req?: Request): Promise<string | null> {
  // Use the new auth() helper
  return await getClerkUserIdFromClerk();
}

export async function getDbUser(req?: Request): Promise<DbUser | null> {
  const userId = await getClerkUserId(req);
  if (!userId) return null;

  // Get or create user by `userId` (this is the Clerk ID stored in DB)
  let user = await prisma.user.findUnique({
    where: { userId }
  });

  if (!user) {
    try {
      // Use Clerk v6 API - clerkClient returns a Promise
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";

      // Try to find by email first (user might exist with different userId)
      user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        // Update existing user with new userId
        user = await prisma.user.update({
          where: { id: user.id },
          data: { userId }
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            userId,
            email,
            name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
            role: email === "jbonutto@gmail.com" ? "super-admin" : "user",
            orgId: "ORG-QRDISPLAY" // Default org for new users
          }
        });
      }
    } catch (e) {
      console.error("Error creating user:", e);
      return null;
    }
  }

  return user;
}

export async function getUserOrganization(user: DbUser | null | undefined) {
  if (!user) return null;
  return prisma.organization.findUnique({ where: { orgId: user.orgId } });
}

export async function canAccessOrganization(user: DbUser | null | undefined, orgId: string) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return user.orgId === orgId;
}

export function isSuperAdmin(user: DbUser | null | undefined) {
  if (!user) return false;
  if (user.roles?.some((r: { name: string }) => r.name === "super-admin")) return true;
  if (user.email === "jbonutto@gmail.com") return true;
  return false;
}

export function isOrgAdmin(user: DbUser | null | undefined, orgId?: string) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.role === "org-admin") {
    if (!orgId) return true; // general org-admin
    return user.orgId === orgId;
  }
  return false;
}

export function isStoreAdmin(user: DbUser | null | undefined, storeId?: string) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.role === "store-admin") {
    if (!storeId) return true;
    return user.storeId === storeId;
  }
  return false;
}

// Helpers to use in API routes: ensures user is authenticated and has role
export async function requireRoleForApi(
  req: Request,
  opts: { require?: "super-admin" | "org-admin" | "store-admin"; orgId?: string; storeId?: string } = {}
) {
  const user = await getDbUser(req);
  if (!user) {
    return { ok: false, status: 401, message: "Unauthenticated" } as const;
  }

  const { require } = opts;
  if (!require) return { ok: true, user } as const;

  let allowed = false;
  if (require === "super-admin") allowed = isSuperAdmin(user);
  if (require === "org-admin") allowed = isOrgAdmin(user, opts.orgId);
  if (require === "store-admin") allowed = isStoreAdmin(user, opts.storeId);

  if (!allowed) return { ok: false, status: 403, message: "Forbidden" } as const;
  return { ok: true, user } as const;
}

// Helper for server components: returns db user or null
export async function useDbUser(req?: Request) {
  return getDbUser(req);
}

export default {
  getClerkUserId,
  getDbUser,
  getUserOrganization,
  canAccessOrganization,
  isSuperAdmin,
  isOrgAdmin,
  isStoreAdmin,
  requireRoleForApi,
  useDbUser,
};
