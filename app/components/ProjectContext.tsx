'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  projectName: string;
  setProjectName: (name: string) => void;
  isRenamingProject: boolean;
  setIsRenamingProject: (isRenaming: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projectName, setProjectName] = useState('untitled-project');
  const [isRenamingProject, setIsRenamingProject] = useState(false);

  return (
    <ProjectContext.Provider value={{ projectName, setProjectName, isRenamingProject, setIsRenamingProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};