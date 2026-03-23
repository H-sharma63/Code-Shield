'use client';

import { X, AlertTriangle } from 'lucide-react';

interface DiscardConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DiscardConfirmationModal({ isOpen, onClose, onConfirm }: DiscardConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] backdrop-blur-sm">
      <div className="bg-cardPanel p-8 rounded-xl shadow-2xl w-full max-w-sm border border-borderLine relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-500/20 rounded-full mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          
          <h2 className="text-xl font-bold text-textPrimary mb-2">Discard Changes?</h2>
          <p className="text-sm text-textSecondary mb-8 leading-relaxed">
            Are you sure you want to discard all changes in this file? This action cannot be undone.
          </p>

          <div className="flex space-x-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-borderLine text-textPrimary font-bold hover:bg-white/5 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg shadow-red-900/20"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
