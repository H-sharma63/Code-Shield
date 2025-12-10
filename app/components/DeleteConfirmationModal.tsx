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
  project: Project | null;
  onConfirm: (project: Project) => void;
}

export default function DeleteConfirmationModal({ isOpen, onClose, project, onConfirm }: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(true);

  useEffect(() => {
    if (inputValue === 'delete') {
      setIsConfirmDisabled(false);
    } else {
      setIsConfirmDisabled(true);
    }
  }, [inputValue]);

  const handleConfirm = () => {
    if (project) {
      onConfirm(project);
      onClose();
    }
  };

  if (!isOpen || !project) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-cardPanel p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">Delete Project</h2>
        <p className="text-textSecondary mb-4">
          To confirm deletion of &quot;<span className="font-bold">{project.projectName}</span>&quot;, please type &quot;<span className="font-bold">delete</span>&quot; in the box below.
        </p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full p-2 rounded bg-cardPanel text-textPrimary border border-borderLine"
          placeholder="type 'delete' to confirm"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-secondaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px] mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="bg-logoutButton hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
