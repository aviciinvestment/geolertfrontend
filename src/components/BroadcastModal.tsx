import React, { useState } from 'react';
import { Radio, X, Send, Loader2, AlertTriangle } from 'lucide-react';

interface BroadcastModalProps {
  open: boolean;
  onClose: () => void;
  recipientLabel: string;
  recipientHint?: string;
  onSubmit: (message: string) => Promise<boolean>;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  open,
  onClose,
  recipientLabel,
  recipientHint,
  onSubmit,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setMessage('');
      setError(null);
      setSending(false);
    }
  }, [open, recipientLabel]);

  if (!open) return null;

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please write a reason/message for this broadcast.');
      return;
    }
    setSending(true);
    setError(null);
    const ok = await onSubmit(trimmed);
    if (!ok) {
      setError('Broadcast failed. Please try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </span>
            Broadcast Notification
          </h3>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1.5">
              Sending to
            </p>
            <div className="flex items-center gap-2.5 bg-[#111111] border border-[#1f1f1f] rounded-lg px-3 py-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{recipientLabel}</p>
                {recipientHint && <p className="text-gray-500 text-xs truncate">{recipientHint}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1.5">
              Reason / Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={4}
              maxLength={2000}
              placeholder="Narrate the reason for this broadcast, instructions, or urgent update to the target..."
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] focus:border-white/50 focus:ring-1 focus:ring-white/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors resize-none disabled:opacity-50"
            />
            <div className="flex justify-between mt-1">
              {error ? (
                <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                  <AlertTriangle size={12} /> {error}
                </span>
              ) : (
                <span />
              )}
              <span className="text-gray-600 text-xs">{message.length}/2000</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#1f1f1f] bg-[#121014]/50">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-[#1f1f1f] rounded-full text-sm font-medium transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-5 py-2 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};