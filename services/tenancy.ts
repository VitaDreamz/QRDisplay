import prisma from "@/lib/prisma";

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function listOrganizationsForUser(userId: string) {
  // The current schema models `User` with an `orgId` field and a relation
  // back to Organization. To find organizations a user belongs to, we
  // search for organizations that have a related user with the given
  // `userId`.
  return prisma.organization.findMany({
    where: { users: { some: { userId } } },
  });
}
