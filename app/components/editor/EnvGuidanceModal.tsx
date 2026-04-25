'use client';

import React from 'react';
import { Key, X, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';

interface EnvGuidanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToEnvManager: () => void;
}

const EnvGuidanceModal = ({ isOpen, onClose, onSwitchToEnvManager }: EnvGuidanceModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#121214] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-highlight/10 p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-highlight/20 rounded-lg">
                            <Key size={24} className="text-highlight" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">Security Alert</h3>
                            <p className="text-[10px] text-highlight font-bold uppercase tracking-widest opacity-70">Environment Configuration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex gap-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                        <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-yellow-500 uppercase tracking-tight">Avoid .env files in Source Control</p>
                            <p className="text-[11px] text-white/60 leading-relaxed">
                                Creating raw <code className="text-yellow-200/80 bg-white/5 px-1 rounded">.env</code> files is risky. They often get accidentally committed to GitHub, exposing your secrets to the world.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-xs font-bold text-highlight border border-white/10">1</div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white uppercase tracking-wide">Use the Environment Manager</p>
                                <p className="text-[11px] text-white/40">We've built a secure vault for your variables. Use the <Key size={10} className="inline mx-1" /> icon in the sidebar.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-xs font-bold text-highlight border border-white/10">2</div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white uppercase tracking-wide">Encrypted & Injected</p>
                                <p className="text-[11px] text-white/40">Your secrets are encrypted at rest and automatically injected into your terminal and cloud environment during execution.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white/[0.02] flex flex-col gap-3 border-t border-white/5">
                    <button 
                        onClick={() => {
                            onSwitchToEnvManager();
                            onClose();
                        }}
                        className="w-full py-3 bg-highlight text-black font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,222,89,0.3)]"
                    >
                        <span>Open Secure Env Manager</span>
                        <ExternalLink size={14} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 text-white/60 font-bold uppercase tracking-widest rounded-xl text-[10px] hover:bg-white/10 transition-all"
                    >
                        I understand, continue anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnvGuidanceModal;
