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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold leading-7 text-gray-900 sm:truncate sm:text-4xl sm:tracking-tight">
            {org.name}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Organization ID: {org.orgId}
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
          {org.shopifyStoreName && (
            <a
              href={`/admin/brands/${org.orgId}/import-products`}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Import Products
            </a>
          )}
          <a
            href={`/admin/brands/${org.orgId}/edit`}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Edit
          </a>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Brand Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">URL Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <a
                  href={`https://qrdisplay.com/${org.slug}`}
                  className="text-indigo-600 hover:text-indigo-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  qrdisplay.com/{org.slug}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{org.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Active
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(org.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Users ({org.users.length})
          </h3>
          {org.users.length === 0 ? (
            <p className="text-sm text-gray-500">No users yet</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {org.users.map((user) => (
                <li key={user.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {user.role}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Stores ({org.stores.length})
          </h3>
          {org.stores.length === 0 ? (
            <p className="text-sm text-gray-500">No stores yet</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {org.stores.map((store) => (
                <li key={store.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{store.storeName}</p>
                      <p className="text-sm text-gray-500">{store.city}, {store.state}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      store.status === 'active'
                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                        : 'bg-gray-50 text-gray-700 ring-gray-600/20'
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
  );
}
