import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Plus, Minus, ChevronRight, Folder, File, Loader2 } from 'lucide-react';
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
  repoFullName: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onFileClick?: (path: string) => void;
  onRun?: () => void;
  onIncreaseFont?: () => void;
  onDecreaseFont?: () => void;
}

export default function TabBar({ tabs, activeTabId, repoFullName, onTabClick, onTabClose, onFileClick, onRun, onIncreaseFont, onDecreaseFont }: TabBarProps) {
  const [pickerPath, setPickerPath] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number, y: number } | null>(null);

  if (tabs.length === 0) return (
    <div className="h-[30px] bg-cardPanel border-b border-borderLine flex items-center px-4">
        <span className="text-[10px] text-textSecondary uppercase font-bold tracking-widest italic text-center w-full">No files open - select a file to begin</span>
    </div>
  );

  const breadcrumbs = activeTabId ? activeTabId.split('/') : [];

  const handleSegmentClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const path = breadcrumbs.slice(0, index + 1).join('/');
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Toggle if same path
    if (pickerPath === path) {
        setPickerPath(null);
        setPickerAnchor(null);
    } else {
        setPickerPath(path);
        setPickerAnchor({ x: rect.left, y: rect.bottom });
    }
  };

  return (
    <div className="flex flex-col w-full shrink-0 relative bg-cardPanel z-30">
      {/* 1. Tab Bar Row */}
      <div className="flex bg-cardPanel border-b border-borderLine h-[32px] items-center justify-between overflow-hidden w-full">
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
                        onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                        className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        <X size={10} />
                    </button>
                </div>
              );
          })}
        </div>
        <div className="flex items-center px-3 space-x-3 h-full border-l border-borderLine bg-cardPanel shrink-0">
          <button onClick={onRun} className="flex items-center space-x-1 px-2 py-0.5 text-textSecondary hover:text-highlight transition-all" title="Run/Analyze (Ctrl+Enter)"><Play size={16} /></button>
        </div>
      </div>

      {/* 2. Breadcrumbs Bar (Interactive) */}
      <div className="h-[22px] bg-base flex items-center px-3 border-b border-borderLine shadow-inner z-20">
          <div className="flex items-center space-x-1 text-[10px] text-textSecondary font-medium overflow-hidden">
              <span className="opacity-40 uppercase tracking-tighter mr-1 font-bold select-none">Files</span>
              <ChevronRight size={10} className="opacity-20" />
              {breadcrumbs.map((segment, index) => (
                  <React.Fragment key={index}>
                      <button 
                        onClick={(e) => handleSegmentClick(e, index)}
                        className={`
                            px-1 rounded transition-colors truncate max-w-[150px]
                            ${index === breadcrumbs.length - 1 ? 'text-textPrimary font-bold' : 'hover:text-textPrimary hover:bg-white/5'}
                            ${pickerPath === breadcrumbs.slice(0, index + 1).join('/') ? 'bg-highlight/10 text-highlight' : ''}
                        `}
                      >
                          {segment}
                      </button>
                      {index < breadcrumbs.length - 1 && (
                          <ChevronRight size={10} className="opacity-20 flex-shrink-0" />
                      )}
                  </React.Fragment>
              ))}
          </div>
      </div>

      {/* 3. Breadcrumb Picker Dropdown */}
      {pickerPath && pickerAnchor && (
          <BreadcrumbPicker 
            path={pickerPath} 
            repoFullName={repoFullName} 
            anchor={pickerAnchor} 
            onClose={() => { setPickerPath(null); setPickerAnchor(null); }}
            onNavigate={(newPath, isDir) => {
                if (!isDir && onFileClick) onFileClick(newPath);
                setPickerPath(null);
                setPickerAnchor(null);
            }}
          />
      )}
    </div>
  );
}

function BreadcrumbPicker({ path, repoFullName, anchor, onClose, onNavigate }: { 
    path: string, repoFullName: string | null, anchor: { x: number, y: number }, onClose: () => void, onNavigate: (path: string, isDir: boolean) => void 
}) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchItems = async () => {
            // Fetch children/siblings for breadcrumbs
            setLoading(true);
            try {
                const lastSlash = path.lastIndexOf('/');
                const parentPath = lastSlash === -1 ? '' : path.substring(0, lastSlash);
                
                let data;
                if (repoFullName) {
                    const response = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(parentPath)}`);
                    data = await response.json();
                } else {
                    // Local Project Support
                    const response = await fetch('/api/get-projects');
                    const localData = await response.json();
                    if (localData.projects) {
                        data = { 
                            items: localData.projects.map((p: any) => ({
                                name: p.fileName,
                                path: p.fileName,
                                type: 'file'
                            }))
                        };
                    }
                }

                if (data && data.items) {
                    setItems(data.items.sort((a: any, b: any) => (b.type === 'dir' ? 1 : -1) - (a.type === 'dir' ? 1 : -1)));
                } else if (data && data.item) {
                   // Fallback for single item (though API should provide items for folders)
                    setItems([data.item]);
                }
            } catch (e) {
                console.error("Breadcrumb fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [path, repoFullName]);

    return (
        <div 
            ref={dropdownRef}
            style={{ left: anchor.x, top: anchor.y + 4 }}
            className="fixed min-w-[200px] max-h-[300px] bg-[#1e1e1e] border border-borderLine shadow-2xl rounded-md z-[100] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 py-1"
        >
            {loading ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 size={16} className="animate-spin text-highlight" />
                </div>
            ) : items.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-textSecondary italic">No items found</div>
            ) : (
                items.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => onNavigate(item.path, item.type === 'dir')}
                        className={`
                            w-full flex items-center space-x-2 px-3 py-1.5 text-[11px] text-left transition-colors
                            ${item.path === path ? 'bg-highlight/20 text-highlight font-bold' : 'text-textPrimary hover:bg-white/5'}
                        `}
                    >
                        <FileIcon name={item.name} isDir={item.type === 'dir'} size={14} />
                        <span className="truncate flex-1">{item.name}</span>
                        {item.type === 'dir' && <ChevronRight size={10} className="opacity-20" />}
                    </button>
                ))
            )}
        </div>
    );
}
