import React from "react";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantDashboard({ params }: Props) {
  const { tenant } = await params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{tenant} dashboard</h1>
      <p className="mt-4 text-muted-foreground">Welcome to your organization's dashboard.</p>
    </div>
  );
}
