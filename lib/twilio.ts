/**
 * Twilio SMS Helper
 * Sends SMS notifications for wholesale order verification
 */

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    // Use the same pattern as the rest of the codebase
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`✅ SMS sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return false;
  }
}
