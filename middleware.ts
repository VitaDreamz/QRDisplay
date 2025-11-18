import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks/clerk",
  "/api/webhooks/shopify(.*)",
  "/api/cron(.*)",
];

const isPublic = createRouteMatcher(publicPaths);

export default clerkMiddleware((_, req) => {
  if (isPublic(req)) {
    return NextResponse.next();
  }
  return null; // Let Clerk handle everything else
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};