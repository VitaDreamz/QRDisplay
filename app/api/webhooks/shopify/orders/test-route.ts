import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple test endpoint to verify webhooks can reach the server
 */
export async function GET(req: NextRequest) {
  console.log('✅ GET request received at /api/webhooks/shopify/orders');
  return NextResponse.json({ 
    success: true, 
    message: 'Webhook endpoint is reachable',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  console.log('✅ POST request received at /api/webhooks/shopify/orders');
  
  const body = await req.text();
  const headers = {
    shopDomain: req.headers.get('x-shopify-shop-domain'),
    topic: req.headers.get('x-shopify-topic'),
    hmac: req.headers.get('x-shopify-hmac-sha256'),
  };
  
  console.log('Headers:', headers);
  console.log('Body length:', body.length);
  
  return NextResponse.json({ 
    success: true, 
    message: 'POST received',
    headers,
    bodyLength: body.length,
    timestamp: new Date().toISOString()
  });
}
