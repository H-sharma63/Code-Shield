'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onConfirm: (item?: any) => void;
  itemName?: string;
  itemType?: 'file' | 'folder' | 'project';
}

export default function DeleteConfirmationModal({ 
  isOpen, onClose, project, onConfirm, itemName, itemType = 'project' 
}: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(true);

  // If it's a project, use project name. Otherwise, use itemName.
  const displayItemName = project ? project.projectName : itemName;

  useEffect(() => {
    if (inputValue.toLowerCase() === 'delete') {
      setIsConfirmDisabled(false);
    } else {
      setIsConfirmDisabled(true);
    }
  }, [inputValue]);

  const handleConfirm = () => {
    if (project) {
      onConfirm(project);
    } else {
      onConfirm();
    }
    setInputValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-cardPanel p-8 rounded-xl shadow-2xl w-full max-w-md border border-borderLine animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-textPrimary mb-2 flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
        </h2>
        
        <p className="text-sm text-textSecondary mb-6 leading-relaxed">
          Are you sure you want to delete &quot;<span className="font-bold text-textPrimary">{displayItemName}</span>&quot;? 
          This action is permanent and cannot be undone.
        </p>

        <div className="space-y-4">
            <p className="text-xs text-textSecondary uppercase tracking-widest font-bold">
                Confirm by typing <span className="text-red-400">&quot;delete&quot;</span>
            </p>
            <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isConfirmDisabled && handleConfirm()}
                className="w-full p-3 rounded-lg bg-base text-textPrimary border border-borderLine focus:border-red-500 outline-none transition-colors"
                placeholder="type 'delete' to confirm"
            />
        </div>

        <div className="flex justify-end mt-8 space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-secondaryAccent/10 hover:bg-secondaryAccent/20 text-textPrimary font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/20"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
