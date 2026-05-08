'use client';

import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { ChevronRight, ChevronDown, Github, FilePlus, FolderPlus, RotateCcw, X, Trash2, Network, Rocket } from 'lucide-react';
import FileUpload from './FileUpload';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import FileIcon from './FileIcon';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import EnvGuidanceModal from './EnvGuidanceModal';
import { useWorkspace } from './WorkspaceContext';

interface FileExplorerProps {
    currentExplorerPath: string;
    explorerItems: any[];
    onItemExpansionToggle: (event: React.SyntheticEvent | null, itemId: string, isExpanded: boolean) => void;
    onItemSelectionToggle: (event: React.SyntheticEvent | null, itemId: string, isSelected: boolean) => void;
    onFileClick: (path: string) => void;
    onPathChange: (newPath: string) => void;
    expandedItems: string[];
    onExpandedItemsChange: (event: React.SyntheticEvent | null, itemIds: string[]) => void;
    onFileUpload: (fileName: string, fileData: string) => void;
    isUploadingFile: boolean;
    refreshExplorer: boolean;
    activeFileName: string;
    repoFullName?: string | null;
    branchName?: string;
    onItemCreated?: (path: string) => void;
    onItemDeleted?: (path: string) => void;
    onNotify?: (message: string, severity: 'success' | 'error') => void;
    onSwitchToEnvManager?: () => void;
}

const ChevronDownIcon = ({ ownerState, ...props }: any) => <ChevronDown size={20} color="#f3f3f3" {...props} />;
const ChevronRightIcon = ({ ownerState, ...props }: any) => <ChevronRight size={20} color="#f3f3f3" {...props} />;

const FileExplorer = ({ 
    currentExplorerPath, explorerItems, onItemExpansionToggle, onItemSelectionToggle, 
    onFileClick, expandedItems, onExpandedItemsChange, onFileUpload, isUploadingFile, 
    refreshExplorer, activeFileName, repoFullName, branchName = 'main', onItemCreated, onItemDeleted, onNotify, onSwitchToEnvManager 
}: FileExplorerProps) => {
    const { changedFiles, nodeModulesMissing } = useWorkspace();
    const searchParams = useSearchParams();
    const [fetchedItems, setFetchedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [localExpanded, setLocalExpanded] = useState<string[]>([]);
    
    // NEW ITEM LOGIC
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [showEnvGuidance, setShowEnvGuidance] = useState(false);
    const [pendingFileCreation, setPendingFileCreation] = useState<string | null>(null);

    // DELETE LOGIC
    const [itemToDelete, setItemToDelete] = useState<{ path: string, type: 'file' | 'folder' } | null>(null);

    const handleCreateItem = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newItemName.trim()) {
            if (!repoFullName) return;
            const prefix = selectedPath ? `${selectedPath}/` : '';
            const finalPath = `${prefix}${newItemName.trim()}`;

            // Check for .env file creation
            if (isCreating === 'file' && (newItemName.trim().toLowerCase().includes('.env') || newItemName.trim().toLowerCase() === '.env')) {
                setPendingFileCreation(finalPath);
                setShowEnvGuidance(true);
                return;
            }
            
            executeCreation(finalPath);
        } else if (e.key === 'Escape') {
            setIsCreating(null);
            setNewItemName('');
        }
    };

    const executeCreation = async (path: string) => {
        try {
            const response = await fetch('/api/github/create-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoFullName, path, type: isCreating, branchName })
            });

            if (response.ok) {
                onItemCreated?.(path);
                onNotify?.(`Successfully created ${isCreating}: ${path.split('/').pop()}`, 'success');
                setIsCreating(null);
                setNewItemName('');
                setPendingFileCreation(null);
                await fetchInitialData();
            } else {
                const data = await response.json();
                onNotify?.(data.error || 'Failed to create item', 'error');
            }
        } catch (error) {
            console.error('Create error:', error);
            onNotify?.('Error creating item on GitHub', 'error');
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete || !repoFullName) return;
        
        try {
            const response = await fetch('/api/github/delete-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoFullName, path: itemToDelete.path, type: itemToDelete.type, branchName })
            });

            if (response.ok) {
                const deletedPath = itemToDelete.path;
                onNotify?.(`${itemToDelete.type === 'file' ? 'File' : 'Folder'} deleted successfully!`, 'success');
                onItemDeleted?.(deletedPath);
                await fetchInitialData();
                setItemToDelete(null);
            } else {
                const data = await response.json();
                onNotify?.(data.error || 'Failed to delete item', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            onNotify?.('Error deleting item on GitHub', 'error');
        }
    };

    // 🏁 VS CODE STYLE SORTING: Folders First, then Files (Alphabetical)
    const sortNodes = (nodes: any[]) => {
        return nodes.sort((a, b) => {
            if (a.isDir !== b.isDir) return b.isDir ? 1 : -1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        });
    };

    // Helper to build a nested tree from a flat list of paths
    const buildTree = (flatItems: any[]) => {
        const root: any[] = [];
        const map: { [key: string]: any } = {};

        flatItems.forEach(item => {
            const parts = item.path.split('/');
            let currentLevel = root;
            let currentPath = '';

            parts.forEach((part: string, index: number) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isLastPart = index === parts.length - 1;

                if (!map[currentPath]) {
                    const newNode = {
                        id: currentPath,
                        name: part,
                        isDir: isLastPart ? item.type === 'dir' : true,
                        children: [],
                    };
                    map[currentPath] = newNode;
                    currentLevel.push(newNode);
                }
                currentLevel = map[currentPath].children;
            });
        });

        // 🚀 Deep Sort recursively
        const deepSort = (nodes: any[]) => {
            sortNodes(nodes);
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) deepSort(node.children);
            });
        };
        deepSort(root);
        
        return root;
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            if (repoFullName) {
                // 1. Fetch Core Files (GitHub)
                const response = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&ref=${branchName}`);
                
                if (response.status === 404) {
                    console.log("[Explorer] Repo is empty (404)");
                    setFetchedItems([]);
                    return;
                }

                const data = await response.json();
                let explorerItems = data.items || [];

                const nestedTree = buildTree(explorerItems);
                setFetchedItems(nestedTree);
            } else {
                const response = await fetch('/api/get-projects');
                const data = await response.json();
                if (data.projects) {
                    setFetchedItems(data.projects.map((project: any) => ({
                        id: String(project.id),
                        name: project.fileName,
                        isDir: false,
                    })));
                }
            }
        } catch (error) {
            console.error('Failed to fetch explorer data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleExpansion = async (event: React.SyntheticEvent | null, itemId: string) => {
        const isExpanding = !localExpanded.includes(itemId);
        if (isExpanding) {
            setLocalExpanded(prev => [...prev, itemId]);
        } else {
            setLocalExpanded(prev => prev.filter(id => id !== itemId));
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [refreshExplorer, repoFullName, branchName, nodeModulesMissing]);

    const renderTree = (items: any[]) => {
        return items.map((item: any) => {
            const isExpanded = localExpanded.includes(item.id);
            const isSelected = selectedPath === item.id;
            const status = changedFiles.find((f: any) => f.path === item.id)?.status;
            const colorClass = status === 'added' ? 'text-green-400' : (status === 'modified' ? 'text-yellow-400' : 'text-textPrimary');

            return (
                <TreeItem 
                    key={item.id} 
                    itemId={item.id} 
                    label={
                        <div 
                            className="flex items-center group/item w-full"
                            style={{ 
                                backgroundColor: isSelected ? '#2a2d2e' : (item.id === activeFileName ? '#333' : 'transparent'), 
                                padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                border: isSelected ? '1px solid #3178c6' : '1px solid transparent'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPath(item.id); 
                                if (!item.isDir) {
                                    onItemSelectionToggle(null, item.id, true);
                                }
                            }}
                        >
                            <FileIcon name={item.name} isDir={item.isDir} isOpen={isExpanded} size={16} />
                            <span className={`text-sm flex-1 ${isSelected ? 'text-highlight font-bold' : colorClass} truncate font-medium`}>{item.name}</span>
                            
                            {/* DELETE ACTION */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToDelete({ path: item.id, type: item.isDir ? 'folder' : 'file' });
                                }}
                                className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity text-textSecondary hover:text-red-400"
                                title="Delete"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    }
                    slots={{
                        collapseIcon: ChevronDownIcon,
                        expandIcon: ChevronRightIcon,
                    }}
                >
                    {item.isDir ? (
                        item.children && item.children.length > 0 
                            ? renderTree(item.children) 
                            : <TreeItem itemId={`${item.id}-placeholder`} label="Empty" sx={{ display: 'none' }} />
                    ) : null}
                </TreeItem>
            );
        });
    };

    return (
        <div className="h-full bg-transparent p-5 flex flex-col overflow-hidden" onClick={() => setSelectedPath(null)}>
            <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-[12px] font-black text-textSecondary uppercase tracking-[0.2em] flex items-center">
                    {repoFullName ? <Github size={14} className="mr-3 text-highlight" /> : null}
                    {repoFullName ? 'Repository' : 'Workspace'}
                </h2>
                <div className="flex items-center space-x-1">
                    <button onClick={() => onFileClick('codeshield://architecture')} title="Architecture Map" className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary transition-colors"><Network size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsCreating('file'); }} title="New File" className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary transition-colors"><FilePlus size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsCreating('folder'); }} title="New Folder" className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary transition-colors"><FolderPlus size={14} /></button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); fetchInitialData(); }} 
                        title="Refresh Explorer" 
                        className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary transition-colors"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>
            
            {!repoFullName && <FileUpload onFileUpload={onFileUpload} />}

            {selectedPath && (
                <div className="flex items-center justify-between px-2 py-1 mb-2 bg-highlight/5 rounded border border-highlight/20 text-[10px]">
                    <span className="text-textSecondary truncate">Target: <span className="text-highlight font-mono">{selectedPath}</span></span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPath(null); }} className="text-textSecondary hover:text-textPrimary"><X size={10} /></button>
                </div>
            )}

            {isCreating && (
                <div className="flex items-center space-x-2 px-2 py-1 bg-base border border-highlight rounded mb-2 shrink-0 shadow-lg">
                    {isCreating === 'file' ? <FilePlus size={14} className="text-highlight" /> : <FolderPlus size={14} className="text-highlight" />}
                    <input
                        autoFocus
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={handleCreateItem}
                        placeholder={`Name ${isCreating}...`}
                        className="bg-transparent text-xs text-textPrimary outline-none flex-1 font-mono"
                    />
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto custom-scrollbar mt-2">
                {loading && fetchedItems.length === 0 ? (
                    <p className="text-textSecondary text-center mt-4 animate-pulse">Building project map...</p>
                ) : fetchedItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4 px-6 text-center">
                        <div className="relative">
                            <Github size={48} strokeWidth={1} className="animate-pulse" />
                            {searchParams.get('template') && searchParams.get('template') !== 'blank' && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_10px_#6366f1]">
                                    <Rocket size={8} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 w-full">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
                                {searchParams.get('template') && searchParams.get('template') !== 'blank' 
                                    ? `Initializing ${searchParams.get('template')}...` 
                                    : 'Empty Repository'}
                            </p>
                            
                            {searchParams.get('template') && searchParams.get('template') !== 'blank' && (
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 animate-[progress_60s_linear_infinite]" style={{ width: '100%' }}></div>
                                </div>
                            )}

                            <p className="text-[9px] text-white/10 leading-relaxed italic max-w-[200px] mx-auto">
                                {searchParams.get('template') && searchParams.get('template') !== 'blank'
                                    ? "Installing dependencies on GCP Server. Files will appear here automatically."
                                    : "Use the terminal to initialize your framework or create a file to begin."}
                            </p>
                        </div>
                        
                        {!searchParams.get('template') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsCreating('file'); }}
                                className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 transition-all"
                            >
                                Create First File
                            </button>
                        )}
                    </div>
                ) : (
                    <SimpleTreeView
                        expandedItems={localExpanded}
                        onItemExpansionToggle={handleToggleExpansion}
                    >
                        {renderTree(fetchedItems)}
                    </SimpleTreeView>
                )}
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                }
            `}</style>

            <DeleteConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteItem}
                itemName={itemToDelete?.path.split('/').pop() || ''}
                itemType={itemToDelete?.type || 'file'}
            />

            <EnvGuidanceModal 
                isOpen={showEnvGuidance}
                onClose={() => {
                    if (pendingFileCreation) executeCreation(pendingFileCreation);
                    setShowEnvGuidance(false);
                }}
                onSwitchToEnvManager={() => {
                    onSwitchToEnvManager?.();
                    setIsCreating(null);
                    setNewItemName('');
                    setPendingFileCreation(null);
                    setShowEnvGuidance(false);
                }}
            />
        </div>
    );
};

export default FileExplorer;
