import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
import { addStoreCredit } from '@/lib/shopify';

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

    // If the display is already linked to a store, update the store too and add credit
    if (updatedDisplay.storeId) {
      const store = await prisma.store.findUnique({
        where: { storeId: updatedDisplay.storeId }
      });
      
      // Only add credit if it hasn't been added yet
      if (store && !(store as any).setupPhotoCredit) {
        try {
          console.log(`💰 Adding $10 store credit + 50 message credits for setup photo to store ${updatedDisplay.storeId}`);
          await addStoreCredit(
            updatedDisplay.storeId,
            10.00,
            'Setup Photo Upload',
            displayId
          );
          
          // Mark that the credit has been applied + add message credits
          await prisma.store.update({
            where: { storeId: updatedDisplay.storeId },
            data: {
              setupPhotoUrl: photoUrl,
              setupPhotoUploadedAt: new Date(),
              setupPhotoCredit: true,
              messageCreditBalance: { increment: 50 }, // Award 50 message credits
            } as any
          });
          
          console.log(`✅ Added $10 store credit + 50 message credits to store ${updatedDisplay.storeId}`);
        } catch (creditErr) {
          console.error('⚠️ Failed to add store credit:', creditErr);
          // Still update the photo even if credit fails
          await prisma.store.update({
            where: { storeId: updatedDisplay.storeId },
            data: {
              setupPhotoUrl: photoUrl,
              setupPhotoUploadedAt: new Date(),
            } as any
          });
        }
      } else {
        // Just update the photo, credit already applied or not applicable
        await prisma.store.update({
          where: { storeId: updatedDisplay.storeId },
          data: {
            setupPhotoUrl: photoUrl,
            setupPhotoUploadedAt: new Date(),
            setupPhotoCredit: true,
          } as any
        });
        
        if ((store as any).setupPhotoCredit) {
          console.log('ℹ️  Store credit already applied - skipping duplicate');
        }
      }
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
