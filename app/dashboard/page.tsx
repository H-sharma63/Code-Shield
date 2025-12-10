'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CreateProjectModal from '@/app/components/CreateProjectModal';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
}

interface Activity extends Project {
  createdAt: string;
  updatedAt: string;
  eventType: 'created' | 'edited';
  eventTimestamp: string;
}

// Helper function to format the time since the activity
const timeSince = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noProjectsFound, setNoProjectsFound] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      // Fetching projects
      fetch('/api/get-projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects);
            setNoProjectsFound(false);
          } else if (data.projects && data.projects.length === 0) {
            setNoProjectsFound(true);
          } else {
            setError('Could not fetch projects.');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Could not fetch projects.');
          setLoading(false);
          setNoProjectsFound(false);
        });

      // Fetching activities
      fetch('/api/get-activity')
        .then((res) => res.json())
        .then((data) => {
          if (data.activities) {
            setActivities(data.activities);
          }
        })
        .catch(() => {
          // Handle activity fetch error separately if needed
          console.error('Could not fetch activities.');
        });
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-base p-8">
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-textPrimary">Dashboard</h1>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-primaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px]"
        >
          Create New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Projects Section */}
        <div className="bg-cardPanel rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Recent Projects</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {noProjectsFound ? (
            <p className="text-textSecondary text-center italic">Create your first project to see it here!</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {projects.slice(0, 4).map((project) => (
                <Link key={project.id} href={`/editor?fileName=${project.fileName}`} className="block mb-4">
                  <div className="bg-base rounded-lg p-4 hover:bg-highlight/20 cursor-pointer">
                    <h3 className="text-xl font-bold text-textPrimary">{project.projectName}</h3>
                    <p className="text-sm text-textSecondary">{project.fileName}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed Section */}
        <div className="bg-cardPanel rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Activity Feed</h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {activities.length > 0 ? (
              activities.slice(0, 4).map((activity) => (
                <div key={`${activity.id}-${activity.eventType}`} className="bg-base rounded-lg p-4">
                  <p className="text-textPrimary">
                    <span className="font-bold">{activity.projectName}</span>{' '}
                    {activity.eventType === 'created' ? 'was created.' : `file ${activity.fileName} was edited.`}
                  </p>
                  <p className="text-sm text-textSecondary">{timeSince(activity.eventTimestamp)}</p>
                </div>
              ))
            ) : (
              <p className="text-textSecondary text-center italic">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

