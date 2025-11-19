# Twilio Webhook Setup Guide

This guide explains how to configure the Twilio webhook for SMS opt-out handling in the QRDisplay platform.

## Overview

The webhook handles incoming SMS replies from customers who receive marketing messages from stores. It automatically processes:
- **STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT** - Opt-out requests
- **START/YES/UNSTOP** - Opt back in
- **HELP/INFO** - Send instructions and support contact

## Webhook Endpoint

**URL:** `https://qrdisplay.com/api/webhooks/twilio/sms`  
**Method:** HTTP POST  
**Content-Type:** application/x-www-form-urlencoded (Twilio standard)

## Setup Steps

### 1. Log into Twilio Console
Navigate to [console.twilio.com](https://console.twilio.com)

### 2. Access Phone Numbers
- Click **Phone Numbers** in the left sidebar
- Click **Manage** → **Active Numbers**
- Select the phone number you're using for QRDisplay SMS campaigns

### 3. Configure Messaging Webhook
Scroll down to the **Messaging** section:

1. **A MESSAGE COMES IN**
   - Webhook URL: `https://qrdisplay.com/api/webhooks/twilio/sms`
   - HTTP Method: `POST`
   
2. **PRIMARY HANDLER FAILS** (optional)
   - Leave blank or set to Twilio's fallback

3. Click **Save** at the bottom

### 4. Test the Webhook

Send a test SMS to your Twilio number:

```
HELP
```

You should receive:
```
QRDisplay SMS Service. Reply STOP to unsubscribe or START to resubscribe. 
Need help? Email support@qrdisplay.com or visit qrdisplay.com/contact
```

Send another test:
```
STOP
```

You should receive:
```
You have been unsubscribed and will not receive further messages. 
Reply START to resubscribe.
```

### 5. Verify Database Updates

After sending STOP, check the database:

```sql
SELECT phone, "smsOptedOut", "smsOptOutDate", "smsOptOutReason" 
FROM "Customer" 
WHERE phone = '+1234567890';
```

Should show:
- `smsOptedOut`: true
- `smsOptOutDate`: Recent timestamp
- `smsOptOutReason`: "STOP"

## What the Webhook Does

### On STOP Request
1. Finds customer by phone number
2. Sets `customer.smsOptedOut = true`
3. Records opt-out date and reason
4. Increments `optOutCount` on most recent campaign (if within 7 days)
5. Sends confirmation TwiML response

### On START Request
1. Finds customer by phone number
2. Sets `customer.smsOptedOut = false`
3. Clears opt-out date and reason
4. Sends confirmation TwiML response

### On HELP Request
1. Sends information about STOP/START commands
2. Provides support contact info and website link

### Other Messages
- Logged to console for future features (e.g., 2-way messaging)
- No auto-reply sent (empty TwiML response)

## Important Notes

### Legal Compliance
- **Required by law:** All SMS marketing must include opt-out instructions
- Our message templates automatically append "Reply STOP to opt out"
- Webhook ensures immediate opt-out processing
- Opted-out customers are excluded from ALL future campaigns

### Message API Integration
The message sending API (`/api/store/message/customers`) automatically:
- Excludes customers where `smsOptedOut = true`
- Applies to ALL audience queries (all, undecided, sampling, purchased, etc.)
- No manual checking required

### Campaign Analytics
- Opt-out counts are tracked per campaign
- Use `MessageCampaign.optOutCount` to monitor campaign quality
- High opt-out rates may indicate poor targeting or message quality

## Troubleshooting

### Webhook Not Responding
1. Check Twilio logs in console: **Monitor** → **Logs** → **Webhooks**
2. Look for 5xx errors or timeouts
3. Verify webhook URL is correct and accessible
4. Check Railway/Vercel deployment logs

### Customer Not Opted Out
1. Check Twilio logs to see if webhook was called
2. Verify phone number format matches database (E.164: +1234567890)
3. Check application logs for errors
4. Manually verify customer record in database

### Messages Still Sent After STOP
1. Verify `smsOptedOut` field is true in database
2. Check message API logs to confirm customer was excluded
3. Ensure no caching issues in API
4. Verify the message wasn't queued before opt-out

## Monitoring

### Check Opt-out Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE "smsOptedOut" = true) as opted_out,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE "smsOptedOut" = true) / COUNT(*), 2) as opt_out_percentage
FROM "Customer"
WHERE "storeId" = 'YOUR_STORE_ID';
```

### Recent Opt-outs
```sql
SELECT 
  "firstName", 
  "lastName", 
  phone, 
  "smsOptOutDate", 
  "smsOptOutReason"
FROM "Customer"
WHERE "smsOptedOut" = true
  AND "smsOptOutDate" > NOW() - INTERVAL '30 days'
ORDER BY "smsOptOutDate" DESC;
```

### Campaign Opt-out Performance
```sql
SELECT 
  id,
  "templateUsed",
  audience,
  "recipientCount",
  "optOutCount",
  ROUND(100.0 * "optOutCount" / "recipientCount", 2) as opt_out_rate,
  "sentAt"
FROM "MessageCampaign"
ORDER BY "sentAt" DESC
LIMIT 10;
```

## Future Enhancements

Potential features to add:
- [ ] 2-way messaging (store replies to customer messages)
- [ ] Inbox view in store dashboard showing customer replies
- [ ] Auto-replies for common questions
- [ ] Sentiment analysis on incoming messages
- [ ] Message templates triggered by customer replies

## Support

For webhook issues:
- Email: support@qrdisplay.com
- Check `/api/webhooks/twilio/sms/route.ts` for implementation
- Review Twilio webhook logs in console
- Check application logs in Railway/Vercel

---

**Last Updated:** November 18, 2025  
**Webhook Version:** 1.0  
**Status:** Production Ready
