import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    console.log('Testing email with Resend...');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'QRDisplay <noreply@qrdisplay.com>',
      to: 'jimbonutto@vitadreamz.com',
      subject: 'Test Email from QRDisplay',
      html: '<h1>Success!</h1><p>Resend is working!</p>'
    });
    
    console.log('Email sent:', result);
    
    return NextResponse.json({ 
      success: true, 
      result,
      message: 'Email sent! Check jimbonutto@vitadreamz.com' 
    });
  } catch (error: any) {
    console.error('Email failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error 
    }, { status: 500 });
  }
}
