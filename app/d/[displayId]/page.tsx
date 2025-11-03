import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function SmartDisplayRoute({ 
  params 
}: { 
  params: Promise<{ displayId: string }> 
}) {
  const { displayId } = await params;
  
  // Look up display
  const display = await prisma.display.findUnique({
    where: { displayId },
    select: { displayId: true, status: true }
  });

  // Handle not found
  if (!display) {
    notFound();
  }

  // Smart routing based on status
  if (display.status === 'inventory' || display.status === 'sold') {
    // Display not yet activated → Store activation flow
    redirect(`/activate/${displayId}`);
  } else if (display.status === 'active') {
    // Display is active → Customer sample request flow
    redirect(`/sample/${displayId}`);
  } else {
    // Unknown status → Default to activation
    redirect(`/activate/${displayId}`);
  }
}
