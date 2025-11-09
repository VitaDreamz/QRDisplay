import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify console.log works in Vercel
 */
export async function GET(req: NextRequest) {
  console.log('🧪 TEST: Console log started');
  console.log('🧪 TEST: This is a test log message');
  console.error('🧪 TEST: This is a test error message');
  console.warn('🧪 TEST: This is a test warning message');
  
  return NextResponse.json({ 
    success: true, 
    message: 'Check Vercel logs for test messages',
    timestamp: new Date().toISOString()
  });
}
