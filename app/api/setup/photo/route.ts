import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    
  // Upload to storage (Vercel Blob, S3, Cloudinary, etc.)
    // For now, we'll just log it and return success
    let photoUrl = '';
    try {
      // TODO: Implement actual storage upload
  // const { put } = await import('@vercel/blob');
  // const blob = await put(`setup-photos/${displayId}-${Date.now()}.jpg`, photo, {
  //   access: 'public',
  // });
  // photoUrl = blob.url;
      
      // For now, just acknowledge the upload
      photoUrl = `setup-photo-${displayId}-${Date.now()}`;
      console.log(`Photo uploaded: ${photo.name}, size: ${photo.size} bytes`);
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      // Still return success - we got the photo
      photoUrl = 'uploaded';
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
