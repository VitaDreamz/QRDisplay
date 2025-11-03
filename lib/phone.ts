export function normalizePhone(raw: string): string {
  // Remove all non-digits
  const clean = raw.replace(/\D/g, '');

  // Validate length
  if (clean.length === 10) {
    return '+1' + clean;
  }
  if (clean.length === 11 && clean[0] === '1') {
    return '+' + clean;
  }

  throw new Error('Invalid phone number. Please enter a 10-digit US phone number.');
}

export function formatPhoneDisplay(raw: string): string {
  // Format for display: (555) 123-4567
  const clean = raw.replace(/\D/g, '');

  if (clean.length >= 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
  }
  if (clean.length >= 6) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if (clean.length >= 3) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
  }

  return clean;
}
