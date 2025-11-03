import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const auth = getAuth(req as any);
  return NextResponse.json({ 
    auth,
    userId: auth?.userId ?? null,
    hasSession: !!auth?.userId
  });
}
