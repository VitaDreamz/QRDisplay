import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File;
    const displayId = formData.get('displayId') as string;
    
    if (!photo || !displayId) {
      return NextResponse.json(
        { success: false, error: 'Photo and displayId required' },
        { status: 400 }
      );
    }
    
    // Upload to Vercel Blob Storage
    let photoUrl = '';
    try {
      console.log(`📸 Uploading photo for ${displayId}: ${photo.name}, size: ${photo.size} bytes`);
      
      // Upload to Vercel Blob with public access
      const blob = await put(`setup-photos/${displayId}-${Date.now()}.${photo.name.split('.').pop()}`, photo, {
        access: 'public',
        addRandomSuffix: true,
      });
      
      photoUrl = blob.url;
      console.log(`✅ Photo uploaded successfully: ${photoUrl}`);
    } catch (uploadError) {
      console.error('❌ Photo upload to Vercel Blob failed:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Photo upload failed' },
        { status: 500 }
      );
    }
    
    // Save photo URL to database and mark credit
    const updatedDisplay = await prisma.display.update({
      where: { displayId },
      // Cast to any to avoid TS mismatch during schema/type propagation
      data: {
        setupPhotoUrl: photoUrl,
        setupPhotoUploadedAt: new Date(),
        setupPhotoCredit: true,
      } as any
    });

    // If the display is already linked to a store, update the store too
    if (updatedDisplay.storeId) {
      await prisma.store.update({
        where: { storeId: updatedDisplay.storeId },
        data: {
          setupPhotoUrl: photoUrl,
          setupPhotoUploadedAt: new Date(),
          setupPhotoCredit: true,
        } as any
      });
    }
    
    console.log(`Setup photo uploaded for ${displayId}: ${photoUrl}`);
    
    return NextResponse.json({
      success: true,
      photoUrl,
      creditApplied: true
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
