"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBrandPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      logoUrl: formData.get("logoUrl") as string,
      adminEmail: formData.get("adminEmail") as string,
      adminName: formData.get("adminName") as string,
      adminPhone: formData.get("adminPhone") as string,
      supportEmail: formData.get("supportEmail") as string,
      supportPhone: formData.get("supportPhone") as string,
      emailFromName: formData.get("emailFromName") as string,
      emailFromAddress: formData.get("emailFromAddress") as string,
      emailReplyTo: formData.get("emailReplyTo") as string,
      websiteUrl: formData.get("websiteUrl") as string,
      type: "client",
    };

    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include", // Send cookies (Clerk session)
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const result = await res.json();
      router.push(`/admin/brands/${result.orgId}`);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Create New Brand Organization
          </h2>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* SECTION 1: Brand Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Information</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="VitaDreamz"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  qrdisplay.com/
                </span>
                <input
                  type="text"
                  name="slug"
                  id="slug"
                  required
                  className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="vitadreamz"
                />
              </div>
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Brand Logo URL
              </label>
              <input
                type="url"
                name="logoUrl"
                id="logoUrl"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended: Square image, 200x200px or larger. Will be displayed in activation emails.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Owner Account (Private) */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔒</span>
            <h3 className="text-lg font-semibold text-gray-900">Owner Account</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Primary account owner for billing, administration, and internal contact (not public-facing)
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                name="adminName"
                id="adminName"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Jim Bonutto"
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Owner Email *
              </label>
              <input
                type="email"
                name="adminEmail"
                id="adminEmail"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="jim@vitadreamz.com"
              />
            </div>

            <div>
              <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Owner Phone *
              </label>
              <input
                type="tel"
                name="adminPhone"
                id="adminPhone"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="+1 (949) 683-6147"
              />
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              ℹ️ This person will receive billing invoices, administrative updates, and have full access to manage the brand account.
            </p>
          </div>
        </div>

        {/* SECTION 3: Public Support Settings */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🌐</span>
            <h3 className="text-lg font-semibold text-gray-900">Public Support Settings</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Public-facing contact information that stores and customers will see
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Support Email *
              </label>
              <input
                type="email"
                name="supportEmail"
                id="supportEmail"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="info@vitadreamz.com"
              />
              <p className="mt-1 text-xs text-gray-500">Where stores contact for help (public)</p>
            </div>

            <div>
              <label htmlFor="supportPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Support Phone
              </label>
              <input
                type="tel"
                name="supportPhone"
                id="supportPhone"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="+1 (323) 536-1296"
              />
              <p className="mt-1 text-xs text-gray-500">Public phone number for store support (optional)</p>
            </div>

            <div>
              <label htmlFor="emailFromName" className="block text-sm font-medium text-gray-700 mb-1">
                Email From Name *
              </label>
              <input
                type="text"
                name="emailFromName"
                id="emailFromName"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="VitaDreamz"
              />
              <p className="mt-1 text-xs text-gray-500">Display name in activation emails</p>
            </div>

            <div>
              <label htmlFor="emailFromAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Email From Address *
              </label>
              <input
                type="email"
                name="emailFromAddress"
                id="emailFromAddress"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="noreply@vitadreamz.com"
              />
              <p className="mt-1 text-xs text-gray-500">Sender email address (must verify domain)</p>
            </div>

            <div>
              <label htmlFor="emailReplyTo" className="block text-sm font-medium text-gray-700 mb-1">
                Email Reply-To
              </label>
              <input
                type="email"
                name="emailReplyTo"
                id="emailReplyTo"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="info@vitadreamz.com"
              />
              <p className="mt-1 text-xs text-gray-500">Where email replies go (defaults to Support Email)</p>
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <input
                type="url"
                name="websiteUrl"
                id="websiteUrl"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="https://vitadreamz.com"
              />
              <p className="mt-1 text-xs text-gray-500">Your brand's website (optional)</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Brand..." : "Create Brand Organization"}
          </button>
        </div>
      </form>
    </div>
  );
}