'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CreateProjectModal from '@/app/components/CreateProjectModal';
import ProjectMenu from '@/app/components/ProjectMenu';
import RenameProjectModal from '@/app/components/RenameProjectModal';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { Folder, Github, FileCode, Lock, ExternalLink, Shield } from 'lucide-react';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  isPrivate: boolean;
  updatedAt: string;
  language: string;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setCreateIsModalOpen] = useState(false);
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const fetchedRef = useRef(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const endpoints = [fetch('/api/get-projects')];
      const isGithub = (session as any)?.provider === 'github';
      
      if (isGithub) {
        endpoints.push(fetch('/api/github/repos'));
      }

      const results = await Promise.all(endpoints);
      
      const projData = await results[0].json();
      if (projData.projects) {
        setProjects(projData.projects);
      }

      if (isGithub && results[1]) {
        const repoData = await results[1].json();
        if (repoData.repos) {
          setRepos(repoData.repos);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Could not fetch workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAllData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status]);

  const handleRename = (project: Project) => {
    setProjectToRename(project);
    setRenameModalOpen(true);
  };

  const handleConfirmRename = async (newProjectName: string) => {
    if (!projectToRename) return;
    try {
      const response = await fetch('/api/rename-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectToRename.id, newProjectName }),
      });
      if (response.ok) {
        fetchAllData();
        setRenameModalOpen(false);
        setProjectToRename(null);
        setSnackbarMessage('Project renamed successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Error renaming project.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (project: Project) => {
    try {
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id }),
      });
      if (response.ok) {
        fetchAllData();
        setDeleteModalOpen(false);
        setSnackbarMessage('Project deleted successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Error deleting project.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Synchronizing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-textPrimary selection:bg-white/10 p-8 font-vscode-ui relative">
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setCreateIsModalOpen(false)} />
      <RenameProjectModal isOpen={isRenameModalOpen} onClose={() => setRenameModalOpen(false)} project={projectToRename} onRename={handleConfirmRename} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} project={projectToDelete} onConfirm={handleConfirmDelete} />
      
      {/* Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primaryAccent/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-secondaryAccent/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">
              <Shield size={12} /> Workspace Registry
            </div>
            <h1 className="text-4xl font-bold text-white font-exo tracking-tight">All Projects</h1>
          </div>
          <button
            onClick={() => setCreateIsModalOpen(true)}
            className="bg-white text-[#060608] hover:bg-white/90 font-bold py-2.5 px-6 rounded-xl transition-all shadow-xl shadow-white/5 font-exo"
          >
            Create New Project
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-8 font-bold">
            {error}
          </div>
        )}

        {/* GITHUB REPOSITORIES */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 font-exo">
              <Github size={20} className="text-white/40" /> GitHub Repositories
            </h2>
            {(session as any)?.provider !== 'github' && (
              <button 
                onClick={() => { const { signIn } = require('next-auth/react'); signIn('github'); }}
                className="text-[10px] font-mono font-bold uppercase tracking-widest text-primaryAccent hover:text-white transition-colors flex items-center gap-2"
              >
                Connect GitHub <ExternalLink size={12} />
              </button>
            )}
          </div>
          
          {(session as any)?.provider === 'github' ? (
            repos.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center bg-white/[0.02]">
                <p className="text-white/40 italic">No GitHub repositories found on this account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo) => (
                  <Link href={`/editor?repo=${repo.fullName}`} key={repo.id}>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.08] hover:border-white/20 transition-all group h-full cursor-pointer">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-base font-bold text-white group-hover:text-primaryAccent transition-colors truncate pr-2 font-exo">{repo.name}</h2>
                          {repo.isPrivate && <Lock size={14} className="text-white/20 shrink-0" />}
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2 h-8 font-medium mb-4">{repo.description || 'No description provided.'}</p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase">
                          <div className="w-2 h-2 rounded-full bg-primaryAccent/50"></div>
                          {repo.language || 'Mixed'}
                        </div>
                        <span className="text-[10px] font-mono text-white/20 uppercase">
                          Remote Sync
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center bg-white/[0.02]">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Github className="text-white/20" size={24} />
              </div>
              <p className="text-white/40 text-sm font-medium mb-2 font-exo">GitHub is not connected to this session.</p>
              <p className="text-white/30 text-xs">Connect your account to analyze your remote repositories.</p>
            </div>
          )}
        </div>

      </div>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
