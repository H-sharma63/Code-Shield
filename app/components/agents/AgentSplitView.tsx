'use client';

import React, { useEffect } from 'react';
import { useWorkspace } from '../editor/WorkspaceContext';

interface AgentSplitViewProps {
    isOpen: boolean;
    sessionId: string | null;
    onClose: () => void;
    activeFileContent: string;
    activeFileName: string;
    onFileCreate: (name: string, content: string) => void;
}

export const AgentSplitView: React.FC<AgentSplitViewProps> = ({ 
    isOpen, 
    sessionId,
    onClose,
    activeFileContent,
    activeFileName,
    onFileCreate
}) => {
    const { mountTerminal } = useWorkspace();
    const terminalRef = React.useRef<HTMLDivElement>(null);

    // 🚀 NATIVE PTY BRIDGE: Mount the clean session instantly
    useEffect(() => {
        if (isOpen && terminalRef.current && sessionId) {
            terminalRef.current.innerHTML = '';
            mountTerminal(sessionId, terminalRef.current);
        }
    }, [isOpen, sessionId, mountTerminal]);

    if (!isOpen) return null;

    return (
        <div className="h-full w-full bg-black overflow-hidden relative">
            {/* 🖥️ RAW INTERACTIVE TERMINAL (Zero UI) */}
            <div ref={terminalRef} className="h-full w-full custom-agent-xterm" />
            
            <style jsx global>{`
                .custom-agent-xterm .xterm-viewport { background-color: black !important; }
                .custom-agent-xterm .xterm-screen { padding: 10px; }
            `}</style>
        </div>
    );
};
