'use client';

import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { getIconConfig } from '@/app/lib/editor/icon-theme';

interface FileIconProps {
  name: string;
  isDir?: boolean;
  isOpen?: boolean;
  size?: number;
}

export default function FileIcon({ name, isDir, isOpen, size = 16 }: FileIconProps) {
  if (isDir) {
    return isOpen ? 
      <FolderOpen size={size} className="text-[#dcb67a] mr-2 shrink-0" fill="#dcb67a" fillOpacity={0.1} /> : 
      <Folder size={size} className="text-[#dcb67a] mr-2 shrink-0" fill="#dcb67a" fillOpacity={0.1} />;
  }

  const { icon: Icon, color, label } = getIconConfig(name);

  if (label) {
    return (
        <div style={{ 
            width: size, height: size, backgroundColor: color, color: label === 'JS' || label === 'PY' ? '#2b2b2b' : 'white', 
            fontWeight: '900', fontSize: size*0.5, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', borderRadius: '1px', marginRight: '8px', flexShrink: 0 
        }}>
          {label}
        </div>
    );
  }

  return <Icon size={size} style={{ color }} className="mr-2 shrink-0" />;
}
