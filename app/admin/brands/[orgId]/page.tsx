import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const org = await prisma.organization.findUnique({
    where: { orgId },
    include: {
      users: true,
      stores: true,
    },
  });

  if (!org) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 sm:truncate sm:tracking-tight">
              {org.name}
            </h1>
            <p className="mt-2 text-sm text-purple-200">
              Organization ID: {org.orgId}
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
            {org.shopifyStoreName && (
              <a
                href={`/admin/brands/${org.orgId}/import-products`}
                className="inline-flex items-center rounded-md bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/50 hover:from-purple-600 hover:to-blue-600"
              >
                Import Products
              </a>
            )}
            <a
              href={`/admin/brands/${org.orgId}/edit`}
              className="inline-flex items-center rounded-md bg-white/10 backdrop-blur-sm border-2 border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Edit
            </a>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-white mb-4">
              Brand Information
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-purple-200">Name</dt>
                <dd className="mt-1 text-sm text-white">{org.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-purple-200">URL Slug</dt>
                <dd className="mt-1 text-sm text-white">
                  <a
                    href={`https://qrdisplay.com/${org.slug}`}
                    className="text-blue-300 hover:text-blue-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    qrdisplay.com/{org.slug}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-purple-200">Type</dt>
                <dd className="mt-1 text-sm text-white capitalize">{org.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-purple-200">Status</dt>
                <dd className="mt-1 text-sm text-white">
                  <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-1 text-xs font-medium text-green-200 ring-1 ring-inset ring-green-400/30">
                    Active
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-purple-200">Created</dt>
                <dd className="mt-1 text-sm text-white">
                  {new Date(org.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-white mb-4">
              Users ({org.users.length})
            </h3>
          {org.users.length === 0 ? (
            <p className="text-sm text-purple-200">No users yet</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {org.users.map((user) => (
                <li key={user.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{user.name || user.email}</p>
                      <p className="text-sm text-purple-200">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-200 ring-1 ring-inset ring-blue-400/30">
                      {user.role}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold leading-6 text-white">
              Stores ({org.stores.length})
            </h3>
            <a
              href={`/admin/brands/${org.orgId}/stores/quick-add`}
              className="inline-flex items-center rounded-md bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/50 hover:from-purple-600 hover:to-blue-600"
            >
              + Quick Add Store
            </a>
          </div>
          {org.stores.length === 0 ? (
            <p className="text-sm text-purple-200">No stores yet</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {org.stores.map((store) => (
                <li key={store.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{store.storeName}</p>
                      <p className="text-sm text-purple-200">{store.city}, {store.state}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      store.status === 'active'
                        ? 'bg-green-500/20 text-green-200 ring-green-400/30'
                        : 'bg-gray-500/20 text-gray-200 ring-gray-400/30'
                    }`}>
                      {store.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
