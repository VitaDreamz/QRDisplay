"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";

export default function SignInCatchAllPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-6">
        <SignIn path="/sign-in" afterSignInUrl="/" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
