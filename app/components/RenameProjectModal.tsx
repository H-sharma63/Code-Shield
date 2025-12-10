'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onRename: (newProjectName: string) => void;
}

export default function RenameProjectModal({ isOpen, onClose, project, onRename }: RenameProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (project) {
      setNewProjectName(project.projectName);
    }
  }, [project]);

  const handleRename = () => {
    onRename(newProjectName);
  };

  if (!isOpen || !project) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-cardPanel p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">Rename Project</h2>
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="w-full p-2 rounded bg-cardPanel text-textPrimary border border-borderLine"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-secondaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px] mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            className="bg-primaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px]"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
