'use client';

import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';

interface FileExplorerProps {
    currentExplorerPath: string;
    explorerItems: any[];
    onItemExpansionToggle: (event: React.SyntheticEvent | null, itemId: string, isExpanded: boolean) => void;
    onItemSelectionToggle: (event: React.SyntheticEvent | null, itemId: string, isSelected: boolean) => void;
    onPathChange: (newPath: string) => void;
    expandedItems: string[]; // New prop
    onExpandedItemsChange: (event: React.SyntheticEvent | null, itemIds: string[]) => void; // New prop, allowing null for event
}

const FileExplorer = ({ currentExplorerPath, explorerItems, onItemExpansionToggle, onItemSelectionToggle, expandedItems, onExpandedItemsChange }: FileExplorerProps) => {
    return (
        <div className="h-full bg-cardPanel rounded-lg mt-[14px] p-4 flex flex-col">
            <h2 className="text-lg font-bold mb-2 text-textPrimary">File Explorer</h2>
            <div className="text-textSecondary text-sm mb-2">Path: {currentExplorerPath}</div>
            <div className="flex-1 overflow-y-auto">
                <RichTreeView
                    key={currentExplorerPath} // Added key prop
                    items={explorerItems}
                    getItemLabel={(item) => item.name}
                    slots={{
                        collapseIcon: FolderIcon,
                        expandIcon: FolderIcon,
                        endIcon: DescriptionIcon,
                    }}
                    onItemExpansionToggle={onItemExpansionToggle}
                    onItemSelectionToggle={onItemSelectionToggle}
                    expandedItems={expandedItems} // Pass to RichTreeView
                    onExpandedItemsChange={onExpandedItemsChange} // Pass to RichTreeView
                />
            </div>
        </div>
    );
};

export default FileExplorer;