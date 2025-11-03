import { config } from 'dotenv';
import { sendActivationEmail } from '../lib/email';

// Load environment variables
config({ path: '.env.local' });

async function testActivationEmail() {
  console.log('📧 Testing activation email template...\n');

  const testData = {
    organization: {
      name: 'VitaDreamz',
      logoUrl: 'https://vitadreamz.com/logo.png',
      emailFromName: 'VitaDreamz',
      emailFromAddress: 'noreply@vitadreamz.com',
      supportEmail: 'info@vitadreamz.com',
      supportPhone: '13235361296',
      websiteUrl: 'https://vitadreamz.com'
    },
    store: {
      contactEmail: 'j.bonutto@gmail.com', // Test email
      contactName: 'Jim Bonutto',
      storeName: 'Main St Pharmacy',
      storeId: 'SID-001'
    },
    display: {
      displayId: 'QRD-001'
    },
    settings: {
      promoOffer: '20% Off 1st In-Store Purchase',
      followupDays: [4, 12],
      timezone: 'America/Los_Angeles',
      contactPhone: '(949) 683-6147',
      streetAddress: '123 Main Street',
      city: 'Venice',
      state: 'CA',
      zipCode: '90291'
    }
  };

  console.log('Sending test email with complete details:');
  console.log('  Store:', testData.store.storeName);
  console.log('  Contact:', testData.store.contactName);
  console.log('  Email:', testData.store.contactEmail);
  console.log('  Phone:', testData.settings.contactPhone);
  console.log('  Address:', `${testData.settings.streetAddress}, ${testData.settings.city}, ${testData.settings.state} ${testData.settings.zipCode}`);
  console.log('  Promo:', testData.settings.promoOffer);
  console.log('  Follow-ups:', testData.settings.followupDays.join(', '), 'days');
  console.log();

  const result = await sendActivationEmail(testData);

  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your inbox:', testData.store.contactEmail);
    console.log();
    console.log('Email should now include:');
    console.log('  ✓ Store name (without "New Store:" prefix)');
    console.log('  ✓ Contact person name');
    console.log('  ✓ Contact email');
    console.log('  ✓ Contact phone');
    console.log('  ✓ Full street address');
    console.log('  ✓ Promo offer');
    console.log('  ✓ Follow-up days');
    console.log('  ✓ Staff PIN (masked)');
  } else {
    console.error('❌ Failed to send test email:', result.error);
  }
}

testActivationEmail();
