'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Download, Trash2 } from 'lucide-react';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

interface ProjectMenuProps {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectMenu({ project, onRename, onDelete }: ProjectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = () => {
    window.open(project.blobUrl, '_blank');
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
        <MoreVertical size={20} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-cardPanel rounded-md shadow-lg z-10">
          <ul className="py-1">
            <li>
              <button
                onClick={() => {
                  onRename(project);
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-textPrimary hover:bg-base"
              >
                <Edit size={16} className="mr-2" />
                Rename
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  handleDownload();
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-textPrimary hover:bg-base"
              >
                <Download size={16} className="mr-2" />
                Download
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onDelete(project);
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-base"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
