import { useState } from 'react';
import { MESSAGE_TEMPLATES, fillTemplate, ensureOptOutText } from '@/lib/message-templates';

interface CustomerMessagingSectionProps {
  store: {
    storeId: string;
    storeName: string;
    messageCreditBalance: number;
    totalMessagesSent: number;
    lastMessageBlastAt: Date | null;
    lastCreditRefill: Date;
  };
  customers: any[];
  onSendCampaign: (data: {
    audience: string;
    message: string;
    templateUsed: string | null;
  }) => Promise<void>;
  messageCampaigns: any[];
}

export default function CustomerMessagingSection({
  store,
  customers,
  onSendCampaign,
  messageCampaigns
}: CustomerMessagingSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState<string>('all');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Calculate audience counts
  const getAudienceCount = (aud: string) => {
    switch (aud) {
      case 'all':
        return customers.filter(c => !c.smsOptedOut).length;
      case 'undecided':
        return customers.filter(c => !c.redeemed && !c.smsOptedOut).length;
      case 'sampling':
        return customers.filter(c => c.redeemed && !c.promoRedeemed && !c.smsOptedOut).length;
      case 'purchased':
        return customers.filter(c => c.promoRedeemed && !c.smsOptedOut).length;
      case 'ready_for_pickup':
        return customers.filter(c => c.currentStage === 'ready_for_pickup' && !c.smsOptedOut).length;
      default:
        return 0;
    }
  };

  // Get current message (from template or custom)
  const getCurrentMessage = () => {
    if (selectedTemplate && selectedTemplate !== 'custom') {
      const template = MESSAGE_TEMPLATES[selectedTemplate];
      if (template) {
        return fillTemplate(template, templateVars, store.storeName);
      }
    }
    return customMessage;
  };

  // Calculate time until next blast allowed
  const getTimeUntilNextBlast = () => {
    if (!store.lastMessageBlastAt) return null;
    
    const lastBlast = new Date(store.lastMessageBlastAt);
    const nextAllowed = new Date(lastBlast.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= nextAllowed) return null;
    
    const hoursLeft = Math.floor((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
    const minutesLeft = Math.floor(((nextAllowed.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours: hoursLeft, minutes: minutesLeft };
  };

  // Get next credit refill date
  const getNextRefillDate = () => {
    const lastRefill = new Date(store.lastCreditRefill);
    const nextRefill = new Date(lastRefill);
    nextRefill.setMonth(nextRefill.getMonth() + 1);
    nextRefill.setDate(1);
    nextRefill.setHours(0, 0, 0, 0);
    
    return nextRefill.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const recipientCount = getAudienceCount(audience);
  const message = getCurrentMessage();
  const creditsNeeded = recipientCount;
  const hasEnoughCredits = store.messageCreditBalance >= creditsNeeded;
  const timeUntilNext = getTimeUntilNextBlast();
  const canSend = hasEnoughCredits && !timeUntilNext && recipientCount > 0 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    
    if (!confirm(`Send to ${recipientCount} customers for ${creditsNeeded} credits?`)) {
      return;
    }
    
    setSending(true);
    try {
      await onSendCampaign({
        audience,
        message: ensureOptOutText(message),
        templateUsed: selectedTemplate !== 'custom' ? selectedTemplate : null
      });
      
      // Reset form
      setSelectedTemplate(null);
      setCustomMessage('');
      setTemplateVars({});
      setAudience('all');
      setExpanded(false);
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Failed to send campaign. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Collapsed State: Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold">📱 Customer Messaging</h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                {store.messageCreditBalance} Credits
              </span>
            </div>
            <p className="text-purple-100 mb-3">
              Reach your customers instantly with SMS campaigns
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-purple-100 mb-4">
              <div>💬 Next refill: {getNextRefillDate()} (+100 credits)</div>
              <div>📊 Sent this month: {store.messageCreditBalance < 100 ? 100 - store.messageCreditBalance : 0}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setExpanded(!expanded);
                  setShowHistory(false);
                }}
                className="bg-white text-purple-600 px-5 py-2.5 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                {expanded ? '✕ Close' : '📢 Send Campaign'}
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setExpanded(false);
                }}
                className="bg-white/10 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
              >
                📊 History ({messageCampaigns.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded State: Message Composer */}
      {expanded && (
        <div className="mt-4 bg-white rounded-lg shadow-lg border-2 border-purple-200 overflow-hidden">
          <div className="p-6">
            <h4 className="text-xl font-bold mb-4">📢 Create Campaign</h4>
            
            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Quick Templates:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(MESSAGE_TEMPLATES).map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setCustomMessage(template.message);
                      setTemplateVars({});
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="font-semibold text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Variable Inputs */}
            {selectedTemplate && selectedTemplate !== 'custom' && MESSAGE_TEMPLATES[selectedTemplate]?.variables.length > 0 && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Fill in details:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MESSAGE_TEMPLATES[selectedTemplate].variables.map(varName => (
                    <div key={varName}>
                      <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                        {varName.replace(/([A-Z])/g, ' $1').trim()}:
                      </label>
                      <input
                        type="text"
                        value={templateVars[varName] || ''}
                        onChange={(e) => setTemplateVars({ ...templateVars, [varName]: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder={`Enter ${varName}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audience Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Send To:</label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Customers', count: getAudienceCount('all') },
                  { value: 'undecided', label: 'Undecided (Haven\'t picked up sample yet)', count: getAudienceCount('undecided') },
                  { value: 'sampling', label: 'Sampling (Picked up, haven\'t purchased)', count: getAudienceCount('sampling') },
                  { value: 'purchased', label: 'Purchased Customers', count: getAudienceCount('purchased') },
                  { value: 'ready_for_pickup', label: 'Ready for Pickup', count: getAudienceCount('ready_for_pickup') }
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: audience === option.value ? '#9333ea' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="audience"
                      value={option.value}
                      checked={audience === option.value}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="flex-1 font-medium text-gray-700">{option.label}</span>
                    <span className="text-sm font-semibold text-purple-600">{option.count} credits</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message Preview/Editor */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message:</label>
              <textarea
                value={message}
                onChange={(e) => {
                  if (selectedTemplate === 'custom' || !selectedTemplate) {
                    setCustomMessage(e.target.value);
                  }
                }}
                rows={4}
                maxLength={160}
                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="Your message will appear here..."
                disabled={selectedTemplate !== 'custom' && selectedTemplate !== null && MESSAGE_TEMPLATES[selectedTemplate]?.variables.length > 0}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {message.length}/160 characters
                  {!message.includes('STOP') && <span className="text-orange-600 ml-2">⚠️ Will auto-add opt-out text</span>}
                </p>
                <p className="text-xs text-gray-500">
                  💡 Use {'{storeName}'} for personalization
                </p>
              </div>
            </div>

            {/* Rate Limit Warning */}
            {timeUntilNext && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-semibold">
                  🚫 Rate Limit: Wait {timeUntilNext.hours}h {timeUntilNext.minutes}m before next campaign
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Last blast sent: {new Date(store.lastMessageBlastAt!).toLocaleString()}
                </p>
              </div>
            )}

            {/* Credit Warning */}
            {!hasEnoughCredits && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ Insufficient Credits: Need {creditsNeeded}, have {store.messageCreditBalance}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Credits refill on the 1st of each month. Contact support to purchase additional credits.
                </p>
              </div>
            )}

            {/* Send Summary */}
            <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Campaign Summary:</p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>📨 Recipients: {recipientCount} customers</li>
                    <li>💳 Credits needed: {creditsNeeded}</li>
                    <li>💰 Remaining after: {store.messageCreditBalance - creditsNeeded}</li>
                  </ul>
                </div>
                {hasEnoughCredits && !timeUntilNext && (
                  <div className="text-right">
                    <div className="text-2xl">✅</div>
                    <p className="text-xs text-green-600 font-semibold mt-1">Ready to send</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={!canSend || sending}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  canSend && !sending
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {sending ? '📤 Sending...' : `📢 Send to ${recipientCount} Customers`}
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message History */}
      {showHistory && messageCampaigns.length > 0 && (
        <div className="mt-4 bg-white rounded-lg shadow-lg border-2 border-purple-200 overflow-hidden">
          <div className="p-6">
            <h4 className="text-xl font-bold mb-4">📊 Campaign History</h4>
            <div className="space-y-3">
              {messageCampaigns.slice(0, 10).map((campaign: any) => (
                <div key={campaign.id} className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-700">{new Date(campaign.sentAt).toLocaleDateString()} • {new Date(campaign.sentAt).toLocaleTimeString()}</p>
                      <p className="text-sm text-gray-600 mt-1 italic">"{campaign.message.substring(0, 80)}{campaign.message.length > 80 ? '...' : ''}"</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 mt-3">
                    <div>📨 Sent to: {campaign.recipientCount} customers ({campaign.audience})</div>
                    <div>💳 Credits: {campaign.creditsUsed}</div>
                    {campaign.optOutCount > 0 && (
                      <div className="text-orange-600">🚫 Opt-outs: {campaign.optOutCount}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
