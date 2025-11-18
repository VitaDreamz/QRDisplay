import prisma from './prisma';

/**
 * Check if a staff member should receive notifications based on their schedule
 * @param staff - Staff member with schedule information
 * @param timezone - IANA timezone (e.g., "America/Los_Angeles", "America/New_York")
 */
export function isStaffOnCall(
  staff: {
    onCallDays: string[];
    onCallHoursStart: string | null;
    onCallHoursStop: string | null;
  },
  timezone: string = 'America/Los_Angeles'
): boolean {
  // Get current time in the store's timezone
  const now = new Date();
  const storeTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Get current day of week in store's timezone (e.g., "Mon", "Tue", etc.)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[storeTime.getDay()];
  
  // Check if today is in their on-call days
  if (!staff.onCallDays || staff.onCallDays.length === 0) {
    // If no days specified, assume always on-call
    return true;
  }
  
  if (!staff.onCallDays.includes(currentDay)) {
    return false; // Not working today
  }
  
  // Check if current time is within their on-call hours
  if (!staff.onCallHoursStart || !staff.onCallHoursStop) {
    // If no hours specified, assume all day
    return true;
  }
  
  const currentTime = `${String(storeTime.getHours()).padStart(2, '0')}:${String(storeTime.getMinutes()).padStart(2, '0')}`;
  
  return currentTime >= staff.onCallHoursStart && currentTime <= staff.onCallHoursStop;
}

/**
 * Get all staff members who should receive notifications for a store
 */
export async function getOnCallStaff(storeId: string): Promise<Array<{
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}>> {
  // First, get the store to retrieve its timezone
  const store = await prisma.store.findUnique({
    where: { storeId },
    select: { timezone: true },
  });

  if (!store) {
    console.warn(`⚠️ Store ${storeId} not found`);
    return [];
  }

  const timezone = store.timezone || 'America/Los_Angeles';

  // Get all active, verified staff for this store
  const allStaff = await prisma.staff.findMany({
    where: {
      store: {
        storeId: storeId // This is the public storeId like "SID-001"
      },
      status: 'active',
      verified: true,
    },
    select: {
      id: true,
      staffId: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      onCallDays: true,
      onCallHoursStart: true,
      onCallHoursStop: true,
    },
  });
  
  // Filter to only those currently on-call (using store's timezone)
  const onCallStaff = allStaff.filter(staff => isStaffOnCall(staff, timezone));
  
  return onCallStaff;
}

/**
 * Send SMS notification to all on-call staff
 */
export async function notifyOnCallStaff(params: {
  storeId: string;
  message: string;
}): Promise<{ sent: number; failed: number }> {
  const { storeId, message } = params;
  
  // Check if Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('⚠️ Twilio not configured, skipping staff notifications');
    return { sent: 0, failed: 0 };
  }
  
  try {
    const onCallStaff = await getOnCallStaff(storeId);
    
    if (onCallStaff.length === 0) {
      console.log(`ℹ️ No on-call staff found for store ${storeId}`);
      return { sent: 0, failed: 0 };
    }
    
    console.log(`📱 Notifying ${onCallStaff.length} on-call staff member(s) for store ${storeId}`);
    
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    let sent = 0;
    let failed = 0;
    
    // Send SMS to each on-call staff member
    for (const staff of onCallStaff) {
      try {
        await client.messages.create({
          to: staff.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message,
        });
        console.log(`✅ Notification sent to ${staff.firstName} ${staff.lastName} (${staff.phone})`);
        sent++;
      } catch (smsErr) {
        console.error(`❌ Failed to send to ${staff.firstName} ${staff.lastName}:`, smsErr);
        failed++;
      }
    }
    
    return { sent, failed };
  } catch (error) {
    console.error('❌ Error in notifyOnCallStaff:', error);
    return { sent: 0, failed: 1 };
  }
}
