'use client';

import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface FileExplorerProps {
    currentExplorerPath: string;
    explorerItems: any[];
    onItemExpansionToggle: (event: React.SyntheticEvent | null, itemId: string, isExpanded: boolean) => void;
    onItemSelectionToggle: (event: React.SyntheticEvent | null, itemId: string, isSelected: boolean) => void;
    onPathChange: (newPath: string) => void;
    expandedItems: string[];
    onExpandedItemsChange: (event: React.SyntheticEvent | null, itemIds: string[]) => void;
}

const ChevronDownIcon = ({ ownerState, ...props }: any) => <ChevronDown size={20} color="#f3f3f3" {...props} />;
const ChevronRightIcon = ({ ownerState, ...props }: any) => <ChevronRight size={20} color="#f3f3f3" {...props} />;

const FileExplorer = ({ currentExplorerPath, explorerItems, onItemExpansionToggle, onItemSelectionToggle, expandedItems, onExpandedItemsChange }: FileExplorerProps) => {

    const renderTree = (items: any[]) => {
        return items.map((item) => (
            <TreeItem 
                key={item.id} 
                itemId={item.id} 
                label={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {item.isDir ? <FolderIcon sx={{ marginRight: 1 }} /> : <DescriptionIcon sx={{ marginRight: 1 }} />}
                        <span>{item.name}</span>
                    </div>
                }
                slots={{
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
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <SimpleTreeView
                    onItemExpansionToggle={onItemExpansionToggle}
                    onItemSelectionToggle={onItemSelectionToggle}
                    expandedItems={expandedItems}
                    onExpandedItemsChange={onExpandedItemsChange}
                >
                    {renderTree(explorerItems)}
                </SimpleTreeView>
            </div>
        </div>
    );
};

export default FileExplorer;