'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    ShieldCheck, Play, Boxes, Zap, Search, Loader2, FileCheck, 
    Terminal as TerminalIcon, AlertCircle, TrendingUp, Trophy, 
    ZapIcon, Eye, Target, MessageSquareCode, Sparkles, Activity,
    LayoutGrid, ChevronRight, CheckCircle2, FlaskConical, Microscope, 
    ShieldAlert, Zap as ZapFilled, Network, Cpu, Info, Download
} from 'lucide-react';
import { getDeepProjectContext } from '@/app/lib/editor/workspace-context';

interface QualityAuditProps {
    code: string;
    fileName: string;
    selectedModel: string;
    repoFullName: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
    onSmartFix?: () => void;
}

type MissionPhase = 'idle' | 'ingestion' | 'scouting' | 'scripting' | 'verifying' | 'complete';
type Tier = 'unit' | 'integration' | 'security' | 'performance';

const TIERS: Tier[] = ['unit', 'integration', 'security', 'performance'];

const QualityAudit = ({ code, fileName, selectedModel, repoFullName, onNotify, onSmartFix }: QualityAuditProps) => {
    const isJS = fileName.match(/\.(js|ts|jsx|tsx)$/);
    const langId = isJS ? 93 : 71;

    const [selectedTiers, setSelectedTiers] = useState<Tier[]>(['unit', 'integration', 'security', 'performance']);
    const [tierStates, setTierStates] = useState<Record<Tier, { 
        phase: MissionPhase; 
        findings: any[]; 
        logs: string; 
        status: 'pending' | 'active' | 'complete';
        testSuite?: { functionName: string; testCases: any[] };
        testResults?: Record<number, { status: 'pass' | 'fail' | 'error' | 'running'; output: string }>;
    }>>({
        unit: { phase: 'idle', findings: [], logs: '', status: 'pending' },
        integration: { phase: 'idle', findings: [], logs: '', status: 'pending' },
        security: { phase: 'idle', findings: [], logs: '', status: 'pending' },
        performance: { phase: 'idle', findings: [], logs: '', status: 'pending' },
    });
        const [healthScore, setHealthScore] = useState(0);
    const [isGlobalMission, setIsGlobalMission] = useState(false);
    const [hasResults, setHasResults] = useState(false);
    const [agentThoughts, setAgentThoughts] = useState<string[]>([]);
    const [focusedTier, setFocusedTier] = useState<Tier | null>(null);

    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }, [agentThoughts]);

    const downloadLogs = () => {
        const logContent = [
            `CODESHIELD AUDIT REPORT\n====================\n`,
            `Health Score: ${healthScore}%\n`,
            `--- SYSTEM TRACE ---\n`,
            ...agentThoughts,
            `\n--- TIER OUTPUTS ---\n`,
            ...Object.entries(tierStates).map(([tier, state]) => `[${tier.toUpperCase()}] ${state.logs}`)
        ].join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const logThought = (msg: string) => setAgentThoughts(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const updateTierState = (tier: Tier, updates: Partial<typeof tierStates[Tier]>) => {
        setTierStates(prev => ({ ...prev, [tier]: { ...prev[tier], ...updates } }));
    };

    const toggleTier = (tier: Tier) => {
        setSelectedTiers(prev => 
            prev.includes(tier) 
                ? prev.filter(t => t !== tier) 
                : [...prev, tier]
        );
    };

    const handleSelectAll = () => {
        if (selectedTiers.length === TIERS.length) setSelectedTiers([]);
        else setSelectedTiers([...TIERS]);
    };

    const runTestCase = async (tier: Tier, testCase: any) => {
        const suite = tierStates[tier].testSuite;
        if (!suite) return;

        updateTierState(tier, {
            testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: 'running', output: '' } }
        });

        const testScript = isJS ? `
${code}
// Test Vector Runner (JS)
try {
    const result = ${suite.functionName}(...${JSON.stringify(testCase.input)});
    const expected = ${JSON.stringify(testCase.expectedOutput)};
    if (JSON.stringify(result) === JSON.stringify(expected)) console.log("PASS");
    else console.log("FAIL: " + JSON.stringify(result) + " != " + JSON.stringify(expected));
} catch (e) {
    console.log("ERROR: " + e.message);
}
` : `
${code}
# Test Vector Runner (Python)
try:
    result = ${suite.functionName}(*${JSON.stringify(testCase.input)})
    expected = ${JSON.stringify(testCase.expectedOutput)}
    if result == expected: print("PASS")
    else: print(f"FAIL: {result} != {expected}")
except Exception as e:
    print(f"ERROR: {e}")
`;

        try {
            const res = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: testScript, language_id: langId })
            });
            const data = await res.json();
            const output = data.stdout || data.stderr || "";
            const isPass = output.includes("PASS");
            
            // Update individual result and append to global tier logs
            updateTierState(tier, {
                testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: isPass ? 'pass' : 'fail', output } },
                logs: (tierStates[tier].logs || "") + `\n--- TEST CASE: ${testCase.description} ---\n${output}\n`
            });
        } catch (e) {
            updateTierState(tier, {
                testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: 'error', output: 'Execution Failed' } },
                logs: (tierStates[tier].logs || "") + `\n--- TEST CASE: ${testCase.description} ---\nERROR: Execution Failed\n`
            });
        }
    };

    const runSingleMission = async (tier: Tier, projectContext: string) => {
        updateTierState(tier, { phase: 'scouting', status: 'active', testResults: {}, logs: "" });
        logThought(`Starting ${tier} audit [Engine: ${isJS ? 'Node.js' : 'Python'}]...`);

        try {
            const scoutRes = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'scout', code, context: projectContext, tier, language: isJS ? 'javascript' : 'python' })
            });
            const scoutData = await scoutRes.json();
            updateTierState(tier, { phase: 'scripting', findings: scoutData.strategy || [] });

            if (tier === 'unit') {
                logThought(`Synthesizing test vectors...`);
                const genRes = await fetch('/api/generate-tests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const genData = await genRes.json();
                updateTierState(tier, { testSuite: genData });
                for (const tc of genData.testCases) await runTestCase('unit', tc);
            }

            const scriptRes = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'script', code, context: projectContext })
            });
            const scriptData = await scriptRes.json();
            updateTierState(tier, { phase: 'verifying' });

            const verifyRes = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: scriptData.testSuite, language_id: 71 })
            });
            const verifyData = await verifyRes.json();
            updateTierState(tier, { phase: 'complete', status: 'complete', logs: verifyData.stdout || verifyData.stderr || "" });
            logThought(`${tier.toUpperCase()} audit complete.`);
        } catch (error: any) {
            logThought(`Audit Error: ${error.message}`);
            updateTierState(tier, { status: 'pending', phase: 'idle' });
        }
    };

    const executeFullMission = async () => {
        if (selectedTiers.length === 0) return;
        
        setIsGlobalMission(true);
        setHasResults(false);
        setAgentThoughts([`[${new Date().toLocaleTimeString()}] Audit engine initializing...`]);

        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        try {
            const projectContext = repoFullName ? await getDeepProjectContext(repoFullName) : "";
            
            // Execute all selected missions with a slight staggered delay to prevent 429 rate limits
            await Promise.all(selectedTiers.map(async (tier, index) => {
                await delay(index * 2000); // Stagger by 2 seconds
                return runSingleMission(tier, projectContext);
            }));
            
            // Calculate actual score
            const allResults = Object.values(tierStates).flatMap(t => Object.values(t.testResults || {}));
            const total = allResults.length;
            const passed = allResults.filter(r => r.status === 'pass').length;
            const score = total > 0 ? Math.round((passed / total) * 100) : 0;
            
            setHealthScore(score);
            setHasResults(true);
        } catch (error: any) {
            onNotify(error.message, "error");
        } finally {
            setIsGlobalMission(false);
        }
    };

    const reset = () => {
        setTierStates({
            unit: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            integration: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            security: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            performance: { phase: 'idle', findings: [], logs: '', status: 'pending' },
        });
        setAgentThoughts([]);
        setHasResults(false);
    };

    const stats = {
        passed: Object.values(tierStates).reduce((acc, t) => acc + Object.values(t.testResults || {}).filter(r => r.status === 'pass').length, 0),
        failed: Object.values(tierStates).reduce((acc, t) => acc + Object.values(t.testResults || {}).filter(r => r.status === 'fail' || r.status === 'error').length, 0),
    };

    return (
        <div className="h-full p-5 flex flex-col space-y-4 @container animate-in fade-in duration-500 overflow-hidden font-vscode-ui bg-editorBackground">
            <h2 className="text-[12px] font-black text-textSecondary uppercase tracking-[0.2em] mb-2 shrink-0">Mission Control</h2>
            
            {/* CONFIG HEADER */}
            {!isGlobalMission && !hasResults && (
                <div className="bg-white/5 rounded-xl p-5 border border-white/5 shadow-lg space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 text-highlight mb-1">
                                <ShieldCheck size={20} />
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Quality Audit</h2>
                            </div>
                            <p className="text-[10px] text-textSecondary font-medium">Verify system integrity & logic proofs.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Audit Tiers</label>
                                <button 
                                    onClick={handleSelectAll}
                                    className="text-[9px] font-bold text-highlight uppercase tracking-widest hover:opacity-80 transition-all"
                                >
                                    {selectedTiers.length === TIERS.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1 bg-base/40 p-1 rounded-lg border border-borderLine/50">
                                {TIERS.map((tier: Tier) => (
                                    <button 
                                        key={tier}
                                        onClick={() => toggleTier(tier)}
                                        className={`py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest ${selectedTiers.includes(tier) ? 'bg-highlight text-black shadow-md' : 'text-textSecondary hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={executeFullMission}
                            disabled={selectedTiers.length === 0}
                            className="w-full flex items-center justify-center space-x-2 bg-highlight hover:bg-highlight/80 text-black py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <Play size={12} fill="currentColor" />
                            <span>Launch Mission</span>
                        </button>
                    </div>
                </div>
            )}

            {/* FOCUSED RUNNING STATE */}
            {isGlobalMission && (
                <div className="flex-1 bg-cardPanel rounded-lg border border-borderLine flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-2 border-highlight/10 border-t-highlight rounded-full animate-spin" />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-highlight animate-pulse" size={20} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-highlight text-[10px] uppercase font-bold tracking-[0.2em] animate-pulse">Audit in Progress</p>
                        <p className="text-textSecondary text-[9px] uppercase tracking-widest">Executing security protocols...</p>
                    </div>
                    <div className="w-full max-w-sm bg-base/40 rounded-lg p-4 h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] text-textSecondary text-left space-y-1" ref={feedRef}>
                        {agentThoughts.map((t, i) => <div key={i} className="opacity-60">{t}</div>)}
                    </div>
                </div>
            )}

            {/* RESULTS AREA */}
            {!isGlobalMission && hasResults && (
                <div className="bg-cardPanel rounded-lg flex-1 flex flex-col border border-borderLine min-h-0 overflow-hidden shadow-inner">
                    <div className="p-4 border-b border-borderLine flex justify-between items-center bg-base/30">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest flex items-center">
                                <CheckCircle2 size={12} className="mr-2 text-green-500" />
                                Audit Results
                            </h3>
                            <div className="flex items-center bg-highlight/10 px-2 py-0.5 rounded border border-highlight/20">
                                <span className="text-[10px] font-black text-highlight">{healthScore}</span>
                                <span className="text-[7px] font-bold text-highlight/60 ml-0.5 uppercase">Score</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={downloadLogs} className="p-1.5 text-textSecondary hover:text-highlight transition-all"><Download size={14} /></button>
                            <button onClick={reset} className="px-3 py-1 bg-highlight text-black text-[9px] font-bold uppercase rounded-md shadow-sm">New Mission</button>
                        </div>
                    </div>

                    <div className="flex-1 bg-base/50 p-4 overflow-y-auto custom-scrollbar space-y-6">
                        {Object.entries(tierStates).map(([tier, state]) => (
                            <div key={tier} className="space-y-3">
                                <h4 className="text-[10px] font-black text-highlight uppercase tracking-[0.1em] flex items-center">
                                    <div className="w-1 h-3 bg-highlight mr-2 rounded-full" />
                                    {tier} Audit
                                </h4>
                                <div className="space-y-2">
                                    {state.testSuite?.testCases?.map((tc: any) => (
                                        <div key={tc.id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-all group">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${state.testResults?.[tc.id]?.status === 'pass' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,44,44,0.4)]'}`} />
                                                <span className="text-[11px] text-textPrimary/90 font-medium">{tc.description}</span>
                                            </div>
                                            <button 
                                                onClick={() => setFocusedTier(tier as Tier)}
                                                className="text-[9px] font-bold text-textSecondary hover:text-highlight uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                Inspect
                                            </button>
                                        </div>
                                    ))}
                                    {(!state.testSuite || state.testSuite.testCases.length === 0) && (
                                        <div className="text-[10px] text-textSecondary/40 italic px-2">No anomalies detected.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DIAGNOSTIC MODAL */}
            {focusedTier && (
                <div className="absolute inset-0 z-[60] bg-base/95 backdrop-blur-md p-8 flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-bold text-highlight uppercase tracking-[0.2em]">{focusedTier} Diagnostic Trace</h3>
                        <button onClick={() => setFocusedTier(null)} className="p-2 text-textSecondary hover:text-highlight"><Activity size={16} /></button>
                    </div>
                    <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-6 font-mono text-[11px] text-white/50 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {tierStates[focusedTier].logs || "No logs available for this session."}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityAudit;
