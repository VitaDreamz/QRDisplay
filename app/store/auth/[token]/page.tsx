import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function StoreAuthTokenPage({ params }: { params: { token: string } }) {
  const { token } = params;

  // 1. Look up the magic link token
  const magicLink = await prisma.magicLink.findUnique({ where: { token } });

  if (!magicLink || magicLink.used || new Date(magicLink.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-600">This magic link is invalid, expired, or already used.</p>
        </div>
      </div>
    );
  }

  // 2. Mark the magic link as used
  await prisma.magicLink.update({ where: { token }, data: { used: true, usedAt: new Date() } });

  // 3. Set a session cookie for the store owner (simulate login)
  const cookieStore = await cookies();
  cookieStore.set('store-id', magicLink.storeId, { path: '/', httpOnly: true, sameSite: 'lax' });

  // 4. Redirect to the store dashboard
  redirect(`/store/dashboard/${magicLink.storeId}`);
}
