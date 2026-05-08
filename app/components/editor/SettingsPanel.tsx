'use client';

import React from 'react';
import EnvManager from './EnvManager';
import { DeploymentVault } from './DeploymentVault';
import { Settings as SettingsIcon, X } from 'lucide-react';

interface SettingsPanelProps {
    repoFullName: string | null;
    userEmail: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ repoFullName, userEmail, onNotify, onClose }) => {
    return (
        <div className="h-full flex flex-col bg-[#09090b] text-white overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#121214] shrink-0">
                <div className="flex items-center gap-2">
                    <SettingsIcon size={16} className="text-white/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Project Settings</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md transition-all text-white/40 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-white/5">
                    <section className="bg-black/20">
                        <EnvManager repoFullName={repoFullName} onNotify={onNotify} />
                    </section>
                    
                    <section className="min-h-[400px]">
                        <DeploymentVault repoFullName={repoFullName} userEmail={userEmail} onNotify={onNotify} />
                    </section>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SettingsPanel;
