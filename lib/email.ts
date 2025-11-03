import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendActivationEmail(data: {
  organization: {
    name: string;
    logoUrl?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    supportEmail?: string;
    supportPhone?: string;
    websiteUrl?: string;
  };
  store: {
    contactEmail: string;
    contactName: string;
    storeName: string;
    storeId: string;
  };
  display: {
    displayId: string;
  };
  settings: {
    promoOffer: string;
    followupDays: number[];
    timezone: string;
    contactPhone: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
}) {
  const { organization, store, display, settings } = data;

  const subject = `✅ Your ${organization.name} Sample Display is Activated!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f5fb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5fb; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #6f42c1, #9a7bd3); padding: 32px 24px; color: #ffffff; border-radius: 16px 16px 0 0; text-align: center;">
                    ${organization.logoUrl ? `<img src="${organization.logoUrl}" alt="${organization.name}" style="width: 80px; height: 80px; border-radius: 8px; margin-bottom: 16px; background: white; padding: 8px;" />` : ''}
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Your Sample Display is Activated! 🎉</h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">Thanks for choosing ${organization.name} at ${store.storeName}</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #2b2b2b;">Hi ${store.contactName || 'there'},</p>
                    
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #2b2b2b;">
                      Your display has been successfully activated and the <strong>Free Sample Program</strong> is up and running!
                    </p>

                    <!-- Details -->
                    <div style="background: #f7f5fb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #6f42c1; text-transform: uppercase; border-bottom: 2px solid #6f42c1; padding-bottom: 8px;">Activation Details</h2>
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px;">
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Store Name</td>
                          <td style="color: #2b2b2b; font-weight: 600; text-align: right; padding: 8px 0;">${store.storeName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Store ID</td>
                          <td style="color: #2b2b2b; font-family: monospace; text-align: right; padding: 8px 0;">${store.storeId}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Display ID</td>
                          <td style="color: #2b2b2b; font-family: monospace; text-align: right; padding: 8px 0;">${display.displayId}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                          <td style="color: #6b6b6b; padding: 8px 0;">Contact Person</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0;">${store.contactName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Email</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0;">${store.contactEmail}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Phone</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0;">${settings.contactPhone}</td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                          <td style="color: #6b6b6b; padding: 8px 0;">Address</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0;">
                            ${settings.streetAddress}<br/>
                            ${settings.city}, ${settings.state} ${settings.zipCode}
                          </td>
                        </tr>
                        <tr style="border-top: 1px solid #e5e7eb;">
                          <td style="color: #6b6b6b; padding: 8px 0;">Promo Offer</td>
                          <td style="color: #6f42c1; font-weight: 600; text-align: right; padding: 8px 0;">${settings.promoOffer}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Follow-Up Days</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0;">${settings.followupDays.join(', ')} days</td>
                        </tr>
                        <tr>
                          <td style="color: #6b6b6b; padding: 8px 0;">Staff PIN</td>
                          <td style="color: #2b2b2b; text-align: right; padding: 8px 0; font-family: monospace;">••••</td>
                        </tr>
                      </table>
                    </div>

                    <!-- What's Next -->
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #2b2b2b;">What's Next?</h2>
                    <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #2b2b2b;">
                      <li>Place your QR Display & Samples in a visible location at your store</li>
                      <li>Encourage customers who are interested to scan the QR Code to claim their sample</li>
                      <li>Check your email and phone for Sample Requests, Follow-up Reports & Customer Feedback</li>
                    </ol>

                    <!-- Support -->
                    <div style="border: 2px dashed #9a7bd3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #6f42c1;">Questions or need help?</h3>
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2b2b2b;">
                        ${organization.supportEmail ? `📧 <a href="mailto:${organization.supportEmail}" style="color: #6f42c1; text-decoration: none;">${organization.supportEmail}</a>` : ''}
                        ${organization.supportPhone ? `<br>📞 <a href="tel:${organization.supportPhone}" style="color: #6f42c1; text-decoration: none;">${organization.supportPhone}</a>` : ''}
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 14px; color: #6b6b6b;">
                      Warm regards,<br>
                      <strong style="color: #2b2b2b;">Team ${organization.name}</strong>
                      ${organization.websiteUrl ? `<br><a href="${organization.websiteUrl}" style="color: #6f42c1; text-decoration: none;">${organization.websiteUrl}</a>` : ''}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7f5fb; padding: 20px 24px; text-align: center; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #6b6b6b;">
                      You received this because your store activated a ${organization.name} Sample display.<br>
                      © ${new Date().getFullYear()} ${organization.name}. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #999999;">
                      Powered by QRDisplay
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    // Use Resend's test domain (works immediately, no DNS setup required)
    // TODO: Switch to noreply@qrdisplay.com after domain verification
    await resend.emails.send({
      from: `${organization.emailFromName || organization.name} <onboarding@resend.dev>`,
      to: store.contactEmail,
      replyTo: organization.supportEmail || undefined,
      subject,
      html
    });

    console.log('✅ Activation email sent to:', store.contactEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error };
  }
}
