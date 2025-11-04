import { NextResponse } from 'next/server';

// This endpoint is deprecated. Magic links have been removed in favor of
// permanent Store ID + PIN login.
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Magic links are no longer supported. Please use your Store ID + PIN at /store/login/{storeId}.',
    },
    { status: 410 }
  );
}
