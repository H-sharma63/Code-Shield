'use client';

import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { ChevronRight, ChevronDown, Github, FilePlus, FolderPlus, RotateCcw, X, Trash2, MoreVertical } from 'lucide-react';
import FileUpload from './FileUpload';
import { useState, useEffect } from 'react';
import FileIcon from './FileIcon';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

interface FileExplorerProps {
    currentExplorerPath: string;
    explorerItems: any[];
    onItemExpansionToggle: (event: React.SyntheticEvent | null, itemId: string, isExpanded: boolean) => void;
    onItemSelectionToggle: (event: React.SyntheticEvent | null, itemId: string, isSelected: boolean) => void;
    onPathChange: (newPath: string) => void;
    expandedItems: string[];
    onExpandedItemsChange: (event: React.SyntheticEvent | null, itemIds: string[]) => void;
    onFileUpload: (fileName: string, fileData: string) => void;
    isUploadingFile: boolean;
    refreshExplorer: boolean;
    activeFileName: string;
    repoFullName?: string | null;
    onItemCreated?: (path: string) => void;
    onItemDeleted?: (path: string) => void;
    onNotify?: (message: string, severity: 'success' | 'error') => void;
}

const ChevronDownIcon = ({ ownerState, ...props }: any) => <ChevronDown size={20} color="#f3f3f3" {...props} />;
const ChevronRightIcon = ({ ownerState, ...props }: any) => <ChevronRight size={20} color="#f3f3f3" {...props} />;

const FileExplorer = ({ 
    currentExplorerPath, explorerItems, onItemExpansionToggle, onItemSelectionToggle, 
    expandedItems, onExpandedItemsChange, onFileUpload, isUploadingFile, 
    refreshExplorer, activeFileName, repoFullName, onItemCreated, onItemDeleted, onNotify 
}: FileExplorerProps) => {
    const [fetchedItems, setFetchedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [localExpanded, setLocalExpanded] = useState<string[]>([]);
    
    // NEW ITEM LOGIC
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
    const [newItemName, setNewItemName] = useState('');

    // DELETE LOGIC
    const [itemToDelete, setItemToDelete] = useState<{ path: string, type: 'file' | 'folder' } | null>(null);

    const handleCreateItem = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newItemName.trim()) {
            if (!repoFullName) return;
            const prefix = selectedPath ? `${selectedPath}/` : '';
            const finalPath = `${prefix}${newItemName.trim()}`;
            
            try {
                const response = await fetch('/api/github/create-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoFullName, path: finalPath, type: isCreating })
                });

                if (response.ok) {
                    onItemCreated?.(finalPath);
                    onNotify?.(`Successfully created ${isCreating}: ${newItemName}`, 'success');
                    setIsCreating(null);
                    setNewItemName('');
                    await fetchInitialData();
                } else {
                    const data = await response.json();
                    onNotify?.(data.error || 'Failed to create item', 'error');
                }
            } catch (error) {
                console.error('Create error:', error);
                onNotify?.('Error creating item on GitHub', 'error');
            }
        } else if (e.key === 'Escape') {
            setIsCreating(null);
            setNewItemName('');
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete || !repoFullName) return;
        
        try {
            const response = await fetch('/api/github/delete-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoFullName, path: itemToDelete.path, type: itemToDelete.type })
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
        return root;
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            if (repoFullName) {
                const response = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}`);
                const data = await response.json();
                if (data.items) {
                    const nestedTree = buildTree(data.items);
                    setFetchedItems(nestedTree);
                }
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

    useEffect(() => {
        fetchInitialData();
    }, [refreshExplorer, repoFullName]);

    const renderTree = (items: any[]) => {
        return items.map((item) => {
            const isExpanded = localExpanded.includes(item.id);
            const isSelected = selectedPath === item.id;

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
                            <span className={`text-sm flex-1 ${isSelected ? 'text-highlight font-bold' : 'text-textPrimary'} truncate font-medium`}>{item.name}</span>
                            
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
                    {item.isDir && item.children && item.children.length > 0 ? renderTree(item.children) : null}
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
                ) : (
                    <SimpleTreeView
                        expandedItems={localExpanded}
                        onExpandedItemsChange={(e, ids) => setLocalExpanded(ids)}
                    >
                        {renderTree(fetchedItems)}
                    </SimpleTreeView>
                )}
            </div>

            <DeleteConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteItem}
                itemName={itemToDelete?.path.split('/').pop() || ''}
                itemType={itemToDelete?.type || 'file'}
            />
        </div>
    );
};

export default FileExplorer;
