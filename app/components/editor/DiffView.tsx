'use client';

import React, { useRef, useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { X } from 'lucide-react';

interface DiffViewProps {
    original: string;
    modified: string;
    language: string;
    fileName: string;
    onClose: () => void;
}

const DiffView = ({ original, modified, language, fileName, onClose }: DiffViewProps) => {
    const editorRef = useRef<any>(null);

    // CRITICAL: Manually reset models before unmount to prevent disposal error
    useEffect(() => {
        return () => {
            if (editorRef.current) {
                console.log("[DIFF_VIEW] Cleaning up models to prevent disposal error...");
                editorRef.current.setModel(null);
            }
        };
    }, []);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const originalPath = `original-${fileName}-${Date.now()}`;
    const modifiedPath = `modified-${fileName}-${Date.now()}`;

    return (
        <div className="h-full flex flex-col bg-base relative animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-cardPanel border-b border-borderLine shrink-0 shadow-sm z-10">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-highlight animate-pulse" />
                    <span className="text-[11px] font-bold text-highlight uppercase tracking-widest">Visual Review</span>
                    <span className="text-[11px] text-textSecondary px-2 border-l border-borderLine ml-2">{fileName}</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-md text-textSecondary hover:text-textPrimary transition-all active:scale-95"
                    title="Close Diff View"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Diff Editor */}
            <div className="flex-1 overflow-hidden">
                <DiffEditor
                    original={original}
                    modified={modified}
                    language={language}
                    originalModelPath={originalPath}
                    modifiedModelPath={modifiedPath}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                        renderSideBySide: true,
                        readOnly: true,
                        originalEditable: false,
                        automaticLayout: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        renderOverviewRuler: false,
                        diffWordWrap: 'off',
                        enableSplitViewResizing: true,
                    }}
                />
            </div>
            
            {/* Legend Footer */}
            <div className="px-4 py-2 bg-cardPanel border-t border-borderLine flex space-x-6 shrink-0 justify-end shadow-inner">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" />
                    <span className="text-[10px] text-textSecondary font-bold uppercase tracking-tighter">Deletions</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded-sm" />
                    <span className="text-[10px] text-textSecondary font-bold uppercase tracking-tighter">Additions</span>
                </div>
            </div>
        </div>
    );
};

export default DiffView;
