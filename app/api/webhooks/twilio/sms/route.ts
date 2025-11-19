import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Twilio SMS Webhook Handler
 * 
 * Handles incoming SMS replies from customers.
 * Primary use: Process STOP/START opt-out requests
 * 
 * Setup in Twilio Console:
 * 1. Go to Phone Numbers → Active Numbers → Select your number
 * 2. Messaging Configuration → A MESSAGE COMES IN
 * 3. Set Webhook URL: https://yourdomain.com/api/webhooks/twilio/sms
 * 4. HTTP POST
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string; // Customer phone number
    const body = (formData.get('Body') as string)?.trim().toUpperCase();
    const messageSid = formData.get('MessageSid') as string;

    if (!from || !body) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`📱 SMS webhook: ${from} → "${body}"`);

    // Handle STOP (opt-out)
    if (body === 'STOP' || body === 'STOPALL' || body === 'UNSUBSCRIBE' || body === 'CANCEL' || body === 'END' || body === 'QUIT') {
      // Find customer by phone
      const customer = await prisma.customer.findFirst({
        where: { phone: from }
      });

      if (customer) {
        // Mark as opted out
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            smsOptedOut: true,
            smsOptOutDate: new Date(),
            smsOptOutReason: body,
          }
        });

        console.log(`🚫 Customer ${customer.id} opted out via ${body}`);

        // Find the most recent campaign they were part of and increment opt-out count
        const recentCampaign = await prisma.messageCampaign.findFirst({
          where: {
            storeId: customer.storeId,
            sentAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { sentAt: 'desc' }
        });

        if (recentCampaign) {
          await prisma.messageCampaign.update({
            where: { id: recentCampaign.id },
            data: {
              optOutCount: { increment: 1 }
            }
          });
        }
      }

      // Twilio auto-replies with confirmation, but we can send custom response
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been unsubscribed and will not receive further messages. Reply START to resubscribe.</Message></Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Handle START (opt back in)
    if (body === 'START' || body === 'YES' || body === 'UNSTOP') {
      const customer = await prisma.customer.findFirst({
        where: { phone: from }
      });

      if (customer) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            smsOptedOut: false,
            smsOptOutDate: null,
            smsOptOutReason: null,
          }
        });

        console.log(`✅ Customer ${customer.id} opted back in via ${body}`);
      }

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been resubscribed to messages. Reply STOP to opt out anytime.</Message></Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Handle HELP
    if (body === 'HELP' || body === 'INFO') {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>QRDisplay SMS Service. Reply STOP to unsubscribe or START to resubscribe. Need help? Email jbonutto@gmail.com or visit qrdisplay.com/contact</Message></Response>`,
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // All other messages - log but don't auto-reply
    // (stores can view and reply manually from their dashboard in the future)
    console.log(`💬 Unhandled message from ${from}: "${body}"`);
    
    // Return empty TwiML response (no auto-reply for general messages)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Twilio webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
