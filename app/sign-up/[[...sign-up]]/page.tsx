"use client";

import React from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpCatchAllPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-6">
        {/* Use catch-all path per Clerk App Router recommendation */}
        <SignUp path="/sign-up/*" routing="path" signInUrl="/sign-in/*" />
      </div>
    </div>
  );
}
