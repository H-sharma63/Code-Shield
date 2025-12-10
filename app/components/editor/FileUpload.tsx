'use client';

import { useDropzone } from 'react-dropzone';
import { z } from 'zod';
import { useState } from 'react';

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

interface FileUploadProps {
  onFileUpload: (fileName: string, fileData: string) => void;
}

const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const [error, setError] = useState<string | null>(null);

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
      onFileUpload(file.name, fileData);
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragActive ? 'border-blue-500' : 'border-gray-500'}`}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>Drag 'n' drop a file here, or click to select a file</p>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default FileUpload;
