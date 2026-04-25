'use client';

import React from 'react';
import { X, AlertTriangle, Save, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  fileName: string;
}

export default function UnsavedChangesModal({ isOpen, onClose, onSave, onDiscard, fileName }: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-3 text-yellow-500">
            <AlertTriangle size={20} />
            <h3 className="font-bold text-sm uppercase tracking-tight text-white">Unsaved Changes</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <p className="text-white/60 text-sm leading-relaxed mb-1">
            Do you want to save the changes you made to 
          </p>
          <p className="text-highlight font-mono text-sm font-bold bg-highlight/10 px-3 py-1 rounded-md inline-block">
            {fileName}
          </p>
          <p className="text-white/40 text-[11px] mt-4 italic">
            Your changes will be lost if you don't save them.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end p-4 bg-black/20 gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          
          <button 
            onClick={onDiscard}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-black transition-all"
          >
            <Trash2 size={14} />
            <span>DON'T SAVE</span>
          </button>

          <button 
            onClick={onSave}
            className="flex items-center space-x-2 px-6 py-2 bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)] rounded-lg text-xs font-black transition-all"
          >
            <Save size={14} />
            <span>SAVE CHANGES</span>
          </button>
        </div>
      </div>
    </div>
  );
}
