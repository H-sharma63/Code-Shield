'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { z } from 'zod';

const fileSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size < 5 * 1024 * 1024, {
      message: 'File size must be less than 5MB',
    })
    .refine(file => {
      const allowedExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c'];
      const fileName = file.name.toLowerCase();
      return allowedExtensions.some(ext => fileName.endsWith(ext));
    }, {
      message: 'Only .js, .ts, .py, .java, .cpp, .c files are allowed',
    }),
});

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = (acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    const result = fileSchema.safeParse({ file });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      localStorage.setItem('newProjectContent', fileData);
      router.push(`/editor?newProject=true&fileName=${file.name}`);
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleCreateProject = () => {
    localStorage.removeItem('newProjectContent'); // Clear any previous content
    router.push(`/editor?newProject=true&projectName=${projectName}&fileName=${fileName}`);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-cardPanel p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">Create New Project</h2>
        
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragActive ? 'border-blue-500' : 'border-gray-500'}`}>
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here ...</p>
          ) : (
            <p>Drag 'n' drop a file here, or click to select a file</p>
          )}
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-t border-gray-600" />
          <span className="mx-4 text-gray-400">OR</span>
          <hr className="flex-grow border-t border-gray-600" />
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full p-2 rounded bg-cardPanel text-textPrimary border border-borderLine"
          />
          <input
            type="text"
            placeholder="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full p-2 rounded bg-cardPanel text-textPrimary border border-borderLine"
          />
          <button
            onClick={handleCreateProject}
            disabled={!projectName || !fileName}
            className="bg-primaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px] w-full disabled:bg-gray-500"
          >
            Create Project
          </button>
        </div>

        <button
          onClick={onClose}
          className="bg-secondaryAccent hover:opacity-80 text-white font-bold py-2 px-4 rounded-[20px] mt-6 w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}
