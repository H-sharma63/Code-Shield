'use client';

import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import { ChevronRight, ChevronDown } from 'lucide-react';
import FileUpload from './FileUpload';
import { useState, useEffect } from 'react';

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
    }
    
    const ChevronDownIcon = ({ ownerState, ...props }: any) => <ChevronDown size={20} color="#f3f3f3" {...props} />;
    const ChevronRightIcon = ({ ownerState, ...props }: any) => <ChevronRight size={20} color="#f3f3f3" {...props} />;
    
    const FileExplorer = ({ currentExplorerPath, explorerItems, onItemExpansionToggle, onItemSelectionToggle, expandedItems, onExpandedItemsChange, onFileUpload, isUploadingFile, refreshExplorer, activeFileName }: FileExplorerProps) => {
        const [fetchedProjects, setFetchedProjects] = useState<any[]>([]);
    
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/get-projects');
                            const data = await response.json();
                            console.log('Fetched projects:', data.projects);
                            if (data.projects) {                    setFetchedProjects(data.projects.map((project: any) => ({
                        id: project.id,
                        name: project.fileName,
                        isDir: false, // All fetched items are files
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            }
        };
    
            useEffect(() => {
                console.log('refreshExplorer changed:', refreshExplorer);
                fetchProjects();
            }, [refreshExplorer]);    
        const renderTree = (items: any[]) => {
            return items.map((item) => (
                <TreeItem 
                    key={item.id} 
                                    itemId={item.id} 
                                    label={
                                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: item.name === activeFileName ? '#333' : 'transparent' }}>
                                            {item.isDir ? <FolderIcon sx={{ marginRight: 1 }} /> : <DescriptionIcon sx={{ marginRight: 1 }} />}
                                            <span>{item.name}</span>
                                        </div>
                                    }
                                    onClick={() => onItemSelectionToggle(null, item.name, true)}                    slots={{
                        collapseIcon: ChevronDownIcon,
                        expandIcon: ChevronRightIcon,
                    }}
                >
                    {item.isDir && (!item.children || item.children.length === 0) ? <div /> : null}
                    {Array.isArray(item.children) ? renderTree(item.children) : null}
                </TreeItem>
            ));
        };
    
        return (
            <div className="h-full bg-cardPanel rounded-lg mt-[14px] p-4 flex flex-col">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">File Explorer</h2>
                <FileUpload onFileUpload={onFileUpload} />
                
                            <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
                                {fetchedProjects.length === 0 ? (
                                    <p className="text-textSecondary text-center mt-4">No files found. Upload a file to get started!</p>
                                ) : (
                                    <SimpleTreeView
                                        onItemExpansionToggle={onItemExpansionToggle}
                                                            onItemSelectionToggle={(event, itemId, isSelected) => {
                                                                if (!isUploadingFile) {
                                                                    const node = fetchedProjects.find(p => p.id === itemId);
                                                                    if (node) {
                                                                        onItemSelectionToggle(event, node.name, isSelected);
                                                                    }
                                                                }
                                                            }}                                        expandedItems={expandedItems}
                                        onExpandedItemsChange={onExpandedItemsChange}
                                    >
                                        {renderTree(fetchedProjects)} {/* Use fetchedProjects here */}
                                    </SimpleTreeView>
                                )}
                            </div>            </div>
        );
    };


export default FileExplorer;