/**
 * MESSAGE TEMPLATES
 * 
 * Pre-made message templates for store customer messaging.
 * Each template includes:
 * - Icon for UI
 * - Name and description
 * - Message text with {variables}
 * - Best audience recommendations
 */

export interface MessageTemplate {
  id: string;
  icon: string;
  name: string;
  description: string;
  message: string;
  variables: string[];
  bestFor: string[];
  maxLength: number;
}

export const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  new_product: {
    id: 'new_product',
    icon: '🎯',
    name: 'New Product Alert',
    description: 'Announce a new product arrival',
    message: 'New {productName} just arrived at {storeName}! Come try it today. Reply STOP to opt out.',
    variables: ['productName'],
    bestFor: ['all', 'purchased'],
    maxLength: 160
  },
  
  flash_sale: {
    id: 'flash_sale',
    icon: '💰',
    name: 'Flash Sale',
    description: 'Limited time discount offer',
    message: '{storeName} Flash Sale! {discount}% off all samples for the next {hours} hours! Reply STOP to opt out.',
    variables: ['discount', 'hours'],
    bestFor: ['undecided', 'sampling'],
    maxLength: 160
  },
  
  reengage: {
    id: 'reengage',
    icon: '🔄',
    name: 'Win-Back Message',
    description: 'Re-engage inactive customers',
    message: 'Hey! Haven\'t seen you at {storeName} lately. Come back for a special surprise! Reply STOP to opt out.',
    variables: [],
    bestFor: ['sampling'],
    maxLength: 160
  },
  
  pickup_ready: {
    id: 'pickup_ready',
    icon: '📦',
    name: 'Pickup Ready',
    description: 'Notify customer their sample is ready',
    message: 'Hi! Your sample is ready for pickup at {storeName}. Stop by anytime! Reply STOP to opt out.',
    variables: [],
    bestFor: ['ready_for_pickup'],
    maxLength: 160
  },
  
  event: {
    id: 'event',
    icon: '🎉',
    name: 'Event Announcement',
    description: 'Promote an in-store event or demo',
    message: '{storeName} is hosting {eventName} on {date}! Free samples & demos. See you there! Reply STOP to opt out.',
    variables: ['eventName', 'date'],
    bestFor: ['all'],
    maxLength: 160
  },
  
  custom: {
    id: 'custom',
    icon: '✍️',
    name: 'Custom Message',
    description: 'Write your own message',
    message: '',
    variables: [],
    bestFor: ['all', 'undecided', 'sampling', 'purchased', 'ready_for_pickup'],
    maxLength: 160
  }
};

/**
 * Get template by ID
 */
export function getTemplate(id: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES[id];
}

/**
 * Fill in template variables
 */
export function fillTemplate(
  template: MessageTemplate,
  variables: Record<string, string>,
  storeName: string
): string {
  let message = template.message;
  
  // Always replace {storeName}
  message = message.replace(/{storeName}/g, storeName);
  
  // Replace other variables
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, 'g');
    message = message.replace(regex, value);
  }
  
  return message;
}

/**
 * Validate message meets requirements
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 160) {
    return { valid: false, error: 'Message exceeds 160 characters' };
  }
  
  if (!message.includes('STOP')) {
    return { valid: false, error: 'Message must include opt-out text' };
  }
  
  return { valid: true };
}

/**
 * Ensure opt-out text is included
 */
export function ensureOptOutText(message: string): string {
  if (message.includes('STOP')) {
    return message;
  }
  
  // Add opt-out text if missing
  const remaining = 160 - message.length - 22; // " Reply STOP to opt out"
  if (remaining >= 0) {
    return `${message} Reply STOP to opt out.`;
  }
  
  // Truncate and add opt-out
  const truncated = message.substring(0, 160 - 23);
  return `${truncated} Reply STOP to opt out.`;
}
