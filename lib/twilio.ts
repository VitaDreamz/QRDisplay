/**
 * Twilio SMS Helper
 * Sends SMS notifications for wholesale order verification
 */

export async function sendSMS(to: string, message: string): Promise<boolean> {
  // Check if Twilio is configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio not configured - SMS not sent');
    console.log(`Would have sent SMS to ${to}: ${message}`);
    return false;
  }

  try {
    // Import Twilio dynamically to avoid build errors if not installed
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    console.log(`SMS sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}
