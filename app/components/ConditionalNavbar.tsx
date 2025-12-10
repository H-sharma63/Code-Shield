'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import { useProject } from './ProjectContext';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ConditionalNavbar = () => {
  const pathname = usePathname();
  const { projectName, setProjectName, isRenamingProject, setIsRenamingProject } = useProject();
  const [renamingProjectName, setRenamingProjectName] = useState("");

  if (pathname.startsWith('/admin')) {
    return null;
  }

  if (pathname === '/editor') {
    return (
      <div className="h-16 bg-cardPanel flex items-center justify-between px-4">
        <Link href="/projects" className="text-textSecondary hover:text-textPrimary">
          <ArrowLeft size={24} />
        </Link>
        {isRenamingProject ? (
          <input
            type="text"
            value={renamingProjectName}
            onChange={(e) => setRenamingProjectName(e.target.value)}
            onBlur={() => {
              setProjectName(renamingProjectName);
              setIsRenamingProject(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setProjectName(renamingProjectName);
                setIsRenamingProject(false);
              }
            }}
            className="bg-cardPanel text-textPrimary text-lg font-semibold outline-none text-center"
            autoFocus
          />
        ) : (
          <span 
            className="text-textPrimary text-lg font-semibold cursor-pointer"
            onClick={() => {
              setRenamingProjectName(projectName);
              setIsRenamingProject(true);
            }}
          >
            {projectName}
          </span>
        )}
        <div></div> {/* Spacer for justify-between */}
      </div>
    );
  }

  return <Navbar />;
};

export default ConditionalNavbar;