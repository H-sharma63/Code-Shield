'use client';

import React, { useState } from 'react';
import { ShieldCheck, Play, Boxes, Zap, Search, Loader2, FileCheck, AlertCircle, Terminal as TerminalIcon } from 'lucide-react';

interface QualityAuditProps {
    code: string;
    selectedModel: string;
    onNotify: (msg: string, type: 'success' | 'error') => void;
}

const QualityAudit = ({ code, selectedModel, onNotify }: QualityAuditProps) => {
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditData, setAuditData] = useState<any>(null);
    const [executionLog, setExecutionLog] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'running' | 'complete'>('idle');

    const runFullAudit = async () => {
        if (!code) return;
        setIsAuditing(true);
        setStatus('analyzing');
        setExecutionLog(null);
        
        try {
            // 1. AI Generation Phase
            const aiResponse = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, analysisType: 'audit', modelId: selectedModel }),
            });
            const data = await aiResponse.json();
            
            if (!aiResponse.ok) throw new Error(data.message || 'AI Audit generation failed');
            setAuditData(data);
            
            // 2. Execution Phase
            setStatus('running');
            const runResponse = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: data.auditCode, 
                    language_id: 71, // Python
                    stdin: "" 
                }),
            });
            const runResult = await runResponse.json();
            const log = runResult.stdout || runResult.stderr || runResult.compile_output || "Execution completed with no output.";
            setExecutionLog(log);
            
            // 3. Parse Full Report for Detailed View
            if (log) {
                try {
                    const jsonMatch = log.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsedReport = JSON.parse(jsonMatch[0]);
                        if (parsedReport.report) {
                            setAuditData((prev: any) => ({
                                ...prev,
                                report: {
                                    unit: parsedReport.report.unit_tests || ["No unit findings"],
                                    integration: parsedReport.report.integration_tests || ["No integration findings"],
                                    security: parsedReport.report.security_tests || ["No security findings"],
                                    performance: parsedReport.report.performance_tests || ["No performance findings"]
                                }
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse detailed report from log:", e);
                }
            }
            
            setStatus('complete');
            onNotify("Full-stack audit complete!", "success");
        } catch (error: any) {
            console.error("Audit Error:", error);
            onNotify(error.message || "Audit failed", "error");
            setStatus('idle');
        } finally {
            setIsAuditing(false);
        }
    };

    return (
        <div className="h-full mt-[14px] flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* AUDIT HEADER */}
            <div className="bg-cardPanel rounded-lg p-5 border border-borderLine shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center space-x-2 text-highlight mb-1">
                            <ShieldCheck size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Quality Engine</h2>
                        </div>
                        <p className="text-[10px] text-textSecondary font-medium">Automated Logic, Security & Performance Scan</p>
                    </div>
                    <button 
                        onClick={runFullAudit}
                        disabled={isAuditing || !code}
                        className="bg-primaryAccent hover:bg-primaryAccent/80 text-white text-[11px] font-bold py-2 px-6 rounded-full flex items-center space-x-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primaryAccent/20"
                    >
                        {isAuditing ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                        <span>{isAuditing ? 'Auditing...' : 'Run System Audit'}</span>
                    </button>
                </div>

                {/* STATUS DASHBOARD */}
                <div className="grid grid-cols-2 gap-3">
                    <AuditCard 
                        icon={<FileCheck size={14} className="text-green-400" />} 
                        label="Unit" 
                        status={status}
                        findings={auditData?.report?.unit} 
                    />
                    <AuditCard 
                        icon={<Boxes size={14} className="text-cyan-400" />} 
                        label="Integration" 
                        status={status}
                        findings={auditData?.report?.integration} 
                    />
                    <AuditCard 
                        icon={<Search size={14} className="text-amber-400" />} 
                        label="Security" 
                        status={status}
                        findings={auditData?.report?.security} 
                    />
                    <AuditCard 
                        icon={<Zap size={14} className="text-purple-400" />} 
                        label="Performance" 
                        status={status}
                        findings={auditData?.report?.performance} 
                    />
                </div>
            </div>

            {/* LIVE LOGS / REPORT */}
            <div className="bg-cardPanel rounded-lg flex-1 flex flex-col border border-borderLine min-h-0 overflow-hidden shadow-inner">
                <div className="p-4 border-b border-borderLine flex justify-between items-center bg-base/30">
                    <h3 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center">
                        <TerminalIcon size={12} className="mr-2" />
                        Audit Execution Log
                    </h3>
                    {status === 'complete' && (
                        <div className="text-[9px] font-bold text-green-400 flex items-center uppercase tracking-tighter">
                            <ShieldCheck size={10} className="mr-1" /> Verified
                        </div>
                    )}
                </div>
                
                <div className="flex-1 bg-base/50 p-4 font-mono text-[11px] overflow-auto custom-scrollbar text-textPrimary leading-relaxed">
                    {status === 'analyzing' ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-10">
                            <div className="relative">
                                <div className="w-12 h-12 border-2 border-highlight/10 border-t-highlight rounded-full animate-spin" />
                                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-highlight animate-pulse" size={20} />
                            </div>
                            <p className="text-highlight text-[10px] uppercase font-bold tracking-widest">AI Generating Audit Strategy...</p>
                        </div>
                    ) : status === 'running' ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-10">
                            <Loader2 className="animate-spin text-highlight" size={32} />
                            <p className="text-highlight text-[10px] uppercase font-bold tracking-widest">Executing Tests in Sandbox...</p>
                        </div>
                    ) : executionLog ? (
                        <div className="animate-in fade-in duration-700">
                            <div className="text-[9px] text-textSecondary border-b border-borderLine pb-2 mb-4 italic">Final Audit Report Generated:</div>
                            <pre className="whitespace-pre-wrap">{executionLog}</pre>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30 grayscale pointer-events-none">
                            <ShieldCheck size={48} className="text-textSecondary" />
                            <p className="text-textSecondary italic text-[11px] max-w-[200px]">Perform a system audit to identify vulnerabilities and bottlenecks.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AuditCard = ({ icon, label, findings, status }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPending = status === 'analyzing' || status === 'idle';
    const findingsList = Array.isArray(findings) ? findings : [findings || 'No findings reported.'];
    const hasMultiple = findingsList.length > 1;

    return (
        <div className={`bg-base/40 p-3 rounded-xl border border-borderLine/50 flex flex-col space-y-2 hover:border-highlight/30 transition-all group shadow-sm min-h-[80px] ${isExpanded ? 'row-span-2' : ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {icon}
                    <span className="text-[10px] font-bold text-textPrimary uppercase tracking-tighter">{label}</span>
                </div>
                {hasMultiple && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[9px] text-textSecondary/70 hover:text-highlight font-bold"
                    >
                        {isExpanded ? 'Hide' : 'Show All'}
                    </button>
                )}
            </div>
            <ul className={`space-y-1.5 flex-1 custom-scrollbar overflow-y-auto ${isExpanded ? 'max-h-[200px]' : 'max-h-[40px]'}`}>
                {isPending ? (
                    <li className="text-[9px] text-textSecondary/60 italic font-medium">Pending analysis...</li>
                ) : (
                    (isExpanded ? findingsList : findingsList.slice(0, 1)).map((item, index) => (
                        <li key={index} className="text-[9px] text-textSecondary/90 leading-tight font-medium flex items-start">
                            <span className="mr-1.5 mt-0.5">{item.includes('✓') || item.toLowerCase().includes('passed') ? '✅' : (item.includes('✗') || item.toLowerCase().includes('warning')) ? '⚠️' : '•'}</span>
                            <span className="flex-1">{item.replace(/[✓✗]/g, '').trim()}</span>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default QualityAudit;
