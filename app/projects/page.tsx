'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateProjectModal from '@/app/components/CreateProjectModal';
import ProjectMenu from '@/app/components/ProjectMenu';
import RenameProjectModal from '@/app/components/RenameProjectModal';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noProjectsFound, setNoProjectsFound] = useState(false);
  const [isCreateModalOpen, setCreateIsModalOpen] = useState(false);
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const router = useRouter();

  const fetchProjects = () => {
    fetch('/api/get-projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          setNoProjectsFound(false);
        } else if (data.projects && data.projects.length === 0) {
          setNoProjectsFound(true);
          setProjects([]); // Clear projects if none found
        } else {
          setError('Could not fetch projects.');
          setNoProjectsFound(false);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not fetch projects.');
        setLoading(false);
        setNoProjectsFound(false); // Ensure this is false on actual error
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleNewProject = () => {
    setCreateIsModalOpen(true);
  };

  const handleRename = (project: Project) => {
    setProjectToRename(project);
    setRenameModalOpen(true);
  };

  const handleConfirmRename = async (newProjectName: string) => {
    if (!projectToRename) return;

    try {
      const response = await fetch('/api/rename-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: projectToRename.id, newProjectName }),
      });

      if (response.ok) {
        fetchProjects();
        setRenameModalOpen(false);
        setProjectToRename(null);
        setSnackbarMessage('Project renamed successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        console.error('Failed to rename project');
        setSnackbarMessage('Failed to rename project.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error renaming project:', error);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: project.id }),
      });

      if (response.ok) {
        fetchProjects();
        setSnackbarMessage('Project deleted successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        console.error('Failed to delete project');
        setSnackbarMessage('Failed to delete project.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setSnackbarMessage('Error deleting project.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-base p-8">
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setCreateIsModalOpen(false)} />
      <RenameProjectModal
        isOpen={isRenameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        project={projectToRename}
        onRename={handleConfirmRename}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        project={projectToDelete}
        onConfirm={handleConfirmDelete}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-textPrimary">Projects</h1>
        <button
          onClick={handleNewProject}
          className="bg-primaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px]"
        >
          Create New Project
        </button>
      </div>
      {noProjectsFound ? (
        <p className="text-textSecondary text-center italic mt-4">Create your first project to see it here!</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-cardPanel rounded-lg shadow p-4 flex flex-col justify-between h-20">
              <div className="flex justify-between items-center">
                <Link href={`/editor?fileName=${project.fileName}&projectName=${project.projectName}`} className="flex-grow">
                  <div className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
                    <h2 className="text-xl font-bold text-textPrimary">{project.projectName}</h2>
                    <p className="text-sm text-textSecondary">{project.fileName}</p>
                  </div>
                </Link>
                <ProjectMenu project={project} onRename={handleRename} onDelete={handleDelete} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
