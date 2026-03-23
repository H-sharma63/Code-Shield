import React from 'react';
import { 
  FileText, FileCode, Settings, GitBranch, Terminal, 
  Database, Image as ImageIcon, Box, Lock, Hash, 
  Layout, Globe, FileJson, Type, Cpu
} from 'lucide-react';

export interface IconConfig {
  icon: any;
  color: string;
  label?: string;
}

export const getIconConfig = (fileName: string): IconConfig => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const lowerName = fileName.toLowerCase();

  // 1. Exact Filename Matches
  if (lowerName === 'package.json') return { icon: Settings, color: '#cbcb41', label: 'JSON' };
  if (lowerName.includes('gitignore')) return { icon: GitBranch, color: '#f44336' };
  if (lowerName === 'dockerfile') return { icon: Box, color: '#519aba' };
  if (lowerName === 'makefile') return { icon: Terminal, color: '#e37933' };
  if (lowerName.includes('license')) return { icon: FileText, color: '#cbcb41' };
  if (lowerName.includes('.env')) return { icon: Lock, color: '#cbcb41' };

  // 2. Extension Mappings
  switch (ext) {
    // Web
    case 'html': return { icon: FileCode, color: '#e37933' };
    case 'css':
    case 'scss':
    case 'less': return { icon: FileCode, color: '#519aba' };
    case 'js':
    case 'jsx': return { icon: FileCode, color: '#cbcb41', label: 'JS' };
    case 'ts':
    case 'tsx': return { icon: FileCode, color: '#519aba', label: 'TS' };
    
    // Languages
    case 'py': return { icon: FileCode, color: '#519aba', label: 'PY' };
    case 'java': return { icon: FileCode, color: '#cc3e44' };
    case 'c':
    case 'cpp': return { icon: FileCode, color: '#519aba' };
    case 'go': return { icon: FileCode, color: '#519aba' };
    case 'php': return { icon: FileCode, color: '#a074c4' };
    case 'rb': return { icon: FileCode, color: '#cc3e44' };
    case 'rs': return { icon: FileCode, color: '#e37933' };
    
    // Config & Data
    case 'json': return { icon: FileJson, color: '#cbcb41' };
    case 'yaml':
    case 'yml': return { icon: Settings, color: '#a074c4' };
    case 'xml': return { icon: FileCode, color: '#519aba' };
    case 'sql': return { icon: Database, color: '#f1e05a' };
    case 'md': return { icon: FileText, color: '#519aba' };
    
    // Media
    case 'svg': return { icon: ImageIcon, color: '#ffb13b' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'ico': return { icon: ImageIcon, color: '#a074c4' };
    
    // Documents & Assets
    case 'pdf': return { icon: FileText, color: '#cc3e44' };
    case 'doc':
    case 'docx': return { icon: FileText, color: '#519aba' };
    case 'ttf':
    case 'woff':
    case 'woff2':
    case 'otf': return { icon: Type, color: '#ffb13b' };
    
    // Others
    case 'sh':
    case 'bash':
    case 'zsh': return { icon: Terminal, color: '#4caf50' };
    case 'exe':
    case 'bin': return { icon: Cpu, color: '#cc3e44' };
    
    default: return { icon: FileText, color: '#858585' };
  }
};
