'use client';

import { X, Play, Plus, Minus } from 'lucide-react';
import FileIcon from './FileIcon';

export interface Tab {
  id: string; // The file path
  name: string;
  content: string;
  originalContent: string;
  language?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onRun?: () => void;
  onIncreaseFont?: () => void;
  onDecreaseFont?: () => void;
}

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onRun, onIncreaseFont, onDecreaseFont }: TabBarProps) {
  
  if (tabs.length === 0) return (
    <div className="h-[30px] bg-cardPanel border-b border-borderLine flex items-center px-4">
        <span className="text-[10px] text-textSecondary uppercase font-bold tracking-widest italic text-center w-full">No files open - select a file to begin</span>
    </div>
  );

  return (
    <div className="flex bg-cardPanel border-b border-borderLine h-[30px] items-center justify-between overflow-hidden w-full">
      {/* Scrollable Tabs Area */}
      <div className="flex flex-1 overflow-x-auto no-scrollbar h-full items-end">
        {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isModified = tab.content !== tab.originalContent;

            return (
            <div
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`
                flex items-center space-x-2 px-3 h-full cursor-pointer border-r border-borderLine min-w-[100px] max-w-[180px] transition-all
                ${isActive ? 'bg-base border-t-2 border-t-highlight text-textPrimary' : 'bg-base/30 text-textSecondary hover:bg-white/5'}
                `}
            >
                <FileIcon name={tab.name} size={14} />
                <span className={`text-[10px] truncate flex-1 font-medium ${isModified ? 'italic' : ''}`}>
                {tab.name} {isModified && '•'}
                </span>
                
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                <X size={10} />
                </button>
            </div>
            );
        })}
      </div>

      {/* Right Side Actions Area */}
      <div className="flex items-center px-3 space-x-3 h-full border-l border-borderLine bg-cardPanel shrink-0">
        <button 
            onClick={onRun}
            className="flex items-center space-x-1 px-2 py-0.5 text-textSecondary hover:text-highlight transition-all"
            title="Run/Analyze (Ctrl+/)"
        >
            <Play size={16} />
        </button>
      </div>
    </div>
  );
}
