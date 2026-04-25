'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Save, FileText, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useWorkspace } from './WorkspaceContext';
import { Snackbar, Alert } from '@mui/material';

interface EnvManagerProps {
    repoFullName: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
}

const EnvManager = ({ repoFullName, onNotify }: EnvManagerProps) => {
    const { syncEnvFile } = useWorkspace();
    const [envVars, setEnvVars] = useState<Record<string, string>>({});
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [importMode, setImportMode] = useState(false);
    const [rawEnv, setRawEnv] = useState('');
    const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    useEffect(() => {
        if (repoFullName) fetchEnvVars();
    }, [repoFullName]);

    const fetchEnvVars = async () => {
        try {
            const res = await fetch(`/api/github/env?repo=${repoFullName}`);
            const data = await res.json();
            if (data.envVars) setEnvVars(data.envVars);
        } catch (e) {
            onNotify("Failed to load environment variables", "error");
        }
    };

    const handleAdd = () => {
        if (!newKey.trim()) return;
        setEnvVars(prev => ({ ...prev, [newKey.trim()]: newValue.trim() }));
        setNewKey('');
        setNewValue('');
    };

    const handleRemove = (key: string) => {
        const newEnvs = { ...envVars };
        delete newEnvs[key];
        setEnvVars(newEnvs);
    };

    const handleSave = async () => {
        if (!repoFullName) return;
        setLoading(true);
        try {
            const res = await fetch('/api/github/env', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoFullName, envVars })
            });
            if (res.ok) {
                onNotify("Environment variables synced to cloud.", "success");
                setSnackbarOpen(true);
            }
            else throw new Error();
        } catch (e) {
            onNotify("Failed to save environment variables.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToRemote = async () => {
        setSnackbarOpen(false);
        try {
            await syncEnvFile(envVars);
            onNotify(".env.local synced to Remote Engine", "success");
        } catch (e) {
            onNotify("Failed to sync to remote engine", "error");
        }
    };

    const handleBulkImport = () => {
        const lines = rawEnv.split('\n');
        const imported: Record<string, string> = { ...envVars };
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valParts] = trimmed.split('=');
                imported[key.trim()] = valParts.join('=').trim().replace(/^['"]|['"]$/g, '');
            }
        });
        setEnvVars(imported);
        setRawEnv('');
        setImportMode(false);
        onNotify("Bulk import processed.", "success");
    };

    const toggleVisibility = (key: string) => {
        const newVisible = new Set(visibleKeys);
        if (newVisible.has(key)) newVisible.delete(key);
        else newVisible.add(key);
        setVisibleKeys(newVisible);
    };

    if (!repoFullName) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-40">
                <AlertCircle size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No Active Repository</p>
                <p className="text-xs mt-2">Open a GitHub repository to manage its secrets.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-5 space-y-6 font-vscode-ui animate-in fade-in duration-500 overflow-hidden relative">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                    <Key size={18} className="text-highlight" />
                    <h2 className="text-[12px] font-black text-textSecondary uppercase tracking-[0.2em]">Environment Variables</h2>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="p-2 hover:bg-highlight/10 text-highlight rounded-lg transition-all"
                    title="Save to Cloud"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
            </div>

            {/* ADD NEW VAR FORM */}
            {!importMode && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            type="text" 
                            placeholder="KEY_NAME" 
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                            className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-highlight/40"
                        />
                        <input 
                            type="password" 
                            placeholder="value_data" 
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-highlight/40"
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="w-full py-2 bg-highlight text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all"
                    >
                        <Plus size={14} />
                        <span>Add Variable</span>
                    </button>
                </div>
            )}

            {/* IMPORT MODE BUTTONS */}
            <div className="flex items-center space-x-2 shrink-0">
                <button 
                    onClick={() => setImportMode(!importMode)}
                    className={`flex-1 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${importMode ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/5 text-textSecondary hover:bg-white/10'}`}
                >
                    {importMode ? <X size={14} /> : <FileText size={14} />}
                    <span>{importMode ? 'Cancel' : 'Bulk Import .env'}</span>
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                {importMode ? (
                    <div className="h-full flex flex-col space-y-4">
                        <textarea 
                            value={rawEnv}
                            onChange={(e) => setRawEnv(e.target.value)}
                            placeholder="PASTE YOUR .env CONTENT HERE...&#10;KEY=VALUE&#10;API_TOKEN=sk-123..."
                            className="flex-1 bg-black/60 border border-highlight/20 rounded-2xl p-4 font-mono text-[10px] text-highlight outline-none resize-none placeholder:text-highlight/20"
                        />
                        <button 
                            onClick={handleBulkImport}
                            className="w-full py-3 bg-highlight text-black rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Process Import
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {Object.entries(envVars).length === 0 ? (
                            <div className="py-10 text-center opacity-20 flex flex-col items-center space-y-2">
                                <Key size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest">No Secrets Configured</p>
                            </div>
                        ) : (
                            Object.entries(envVars).map(([key, value]) => (
                                <div key={key} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                                    <div className="flex flex-col min-w-0 flex-1 mr-2">
                                        <span className="text-[10px] font-black text-highlight/80 truncate uppercase tracking-tighter">{key}</span>
                                        <span className="text-[9px] font-mono text-textSecondary truncate">
                                            {visibleKeys.has(key) ? value : '••••••••••••••••'}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => toggleVisibility(key)} className="p-1.5 hover:bg-white/10 rounded-md text-textSecondary">
                                            {visibleKeys.has(key) ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <button onClick={() => handleRemove(key)} className="p-1.5 hover:bg-red-500/10 rounded-md text-red-400">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 bg-highlight/5 border border-highlight/10 rounded-xl shrink-0">
                <p className="text-[8px] text-highlight/60 leading-relaxed italic">
                    Secrets are encrypted at rest and injected into runtime environments during execution. Never commit raw secrets to source control.
                </p>
            </div>

            {/* Sync Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ position: 'absolute', bottom: 20 }}
            >
                <Alert 
                    severity="info" 
                    variant="filled"
                    sx={{ 
                        width: '100%', 
                        bgcolor: '#3b82f6', 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        '.MuiAlert-action': { padding: 0, marginLeft: 1 }
                    }}
                    action={
                        <button 
                            onClick={handleSyncToRemote}
                            className="px-2 py-0.5 bg-black text-white text-[9px] font-black uppercase rounded hover:bg-black/80 transition-all"
                        >
                            Sync Now
                        </button>
                    }
                >
                    Update remote .env?
                </Alert>
            </Snackbar>
        </div>
    );
};

const Loader2 = ({ size, className }: { size: number, className: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);

export default EnvManager;
