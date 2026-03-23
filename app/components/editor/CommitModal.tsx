'use client';

import { useState } from 'react';
import { Github, X, Send, Loader2 } from 'lucide-react';

interface CommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string) => Promise<void>;
  fileName: string;
}

export default function CommitModal({ isOpen, onClose, onCommit, fileName }: CommitModalProps) {
  const [message, setMessage] = useState(`Review and update ${fileName}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onCommit(message);
      onClose();
    } catch (error) {
      console.error('Commit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-cardPanel p-8 rounded-xl shadow-2xl w-full max-w-md border border-borderLine relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primaryAccent/20 rounded-lg">
            <Github className="text-primaryAccent" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary">Commit to GitHub</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2 uppercase tracking-wider">
              Commit Message
            </label>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 rounded-lg bg-base text-textPrimary border border-borderLine focus:border-primaryAccent focus:ring-1 focus:ring-primaryAccent outline-none transition-all resize-none h-32"
              placeholder="Describe your changes..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-borderLine text-textPrimary font-bold hover:bg-white/5 transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primaryAccent hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Send size={18} />
                  <span>Commit & Push</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
