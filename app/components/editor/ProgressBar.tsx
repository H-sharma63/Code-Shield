'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-white/50">{status}</span>
        <span className="text-sm font-medium text-white/50">{progress}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2.5">
        <div 
          className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
