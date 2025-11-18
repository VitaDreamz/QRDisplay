import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhooks/clerk",
  "/api/webhooks/shopify(.*)", // Exclude Shopify webhooks from Clerk middleware
  "/api/cron(.*)", // Exclude cron jobs from Clerk middleware (they use bearer token auth)
];

const isPublic = createRouteMatcher(publicPaths);

export default clerkMiddleware((_, req) => {
  if (isPublic(req)) {
    return NextResponse.next();
  }
  return null; // Let Clerk handle everything else
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next|api/cron).*)", // Exclude static files, _next, and /api/cron
    "/",
  ],
};