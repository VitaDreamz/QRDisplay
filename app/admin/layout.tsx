"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;

    // Redirect if not signed in
    if (!isSignedIn) {
      redirect("/sign-in");
    }

    // Check for super admin access by email
    // This is a temporary check - we'll enhance it with our RBAC later
    if (user?.primaryEmailAddress?.emailAddress !== "jbonutto@gmail.com") {
      redirect("/");
    }
  }, [isLoaded, isSignedIn, user]);

  // Show nothing while loading
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">QR Display Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}