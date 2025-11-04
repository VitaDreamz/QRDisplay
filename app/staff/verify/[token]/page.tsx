import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function StaffVerifyPage({ 
  params 
}: { 
  params: Promise<{ token: string }>
}) {
  const { token } = await params;

  // Look up staff by token
  const staff = await prisma.staff.findUnique({
    where: { verificationToken: token },
    include: { store: true }
  });

  // Check if token is valid and not expired
  const isExpired = staff?.verificationExpiry && staff.verificationExpiry < new Date();

  if (!staff || isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid or Expired Link</h1>
          <p className="text-gray-600 mb-4">
            This verification link is invalid or has expired.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your store manager for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // If already verified, redirect to login
  if (staff.verified) {
    redirect(`/store/login/${staff.store.storeId}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          Welcome to {staff.store.storeName}!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {staff.firstName} {staff.lastName}
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-medium mb-2">
            Your PIN is the last 4 digits of your phone:
          </p>
          <p className="text-3xl font-bold text-blue-600 text-center">
            {staff.staffPin}
          </p>
        </div>
        
        <form action={`/api/staff/verify/${token}`} method="POST">
          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-700">
              Enter your PIN to verify:
            </span>
            <input
              type="text"
              name="pin"
              required
              maxLength={4}
              pattern="[0-9]{4}"
              placeholder="****"
              className="mt-1 block w-full rounded-md border-gray-300 text-center text-2xl tracking-widest"
              autoFocus
            />
          </label>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Verify & Continue
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">
            After verification, you can login anytime at:
          </p>
          <p className="text-sm font-mono text-center text-blue-600">
            qrdisplay.com/store/login/{staff.store.storeId}
          </p>
        </div>
      </div>
    </div>
  );
}
