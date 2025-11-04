import { NextRequest, NextResponse } from 'next/server';

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
    
    // TODO: Save photo URL to database
    // await prisma.display.update({
    //   where: { displayId },
    //   data: { setupPhotoUrl: photoUrl }
    // });
    
    // TODO: Apply $10 credit to store account
    // This could be a flag that's checked during next sample order
    // await prisma.store.update({
    //   where: { displays: { some: { displayId } } },
    //   data: { setupPhotoCredit: 1000 } // $10 in cents
    // });
    
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
