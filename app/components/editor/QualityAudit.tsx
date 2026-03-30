'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    ShieldCheck, Play, Boxes, Zap, Search, Loader2, FileCheck, 
    Terminal as TerminalIcon, AlertCircle, TrendingUp, Trophy, 
    ZapIcon, Eye, Target, MessageSquareCode, Sparkles, Activity,
    LayoutGrid, ChevronRight, CheckCircle2, FlaskConical, Microscope, 
    ShieldAlert, Zap as ZapFilled, Network, Cpu, Info
} from 'lucide-react';
import { getDeepProjectContext } from '@/app/lib/editor/workspace-context';

interface QualityAuditProps {
    code: string;
    selectedModel: string;
    repoFullName: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
    onSmartFix?: () => void;
}

type MissionPhase = 'idle' | 'ingestion' | 'scouting' | 'scripting' | 'verifying' | 'complete';
type Tier = 'unit' | 'integration' | 'security' | 'performance';

const TIERS: Tier[] = ['unit', 'integration', 'security', 'performance'];

const QualityAudit = ({ code, selectedModel, repoFullName, onNotify, onSmartFix }: QualityAuditProps) => {
    const [activeTier, setActiveTier] = useState<'all' | Tier>('all');
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
    const [agentThoughts, setAgentThoughts] = useState<string[]>([]);
    const [isTraceOpen, setIsTraceOpen] = useState(false);
    const [focusedTier, setFocusedTier] = useState<Tier | null>(null);
    const [selectedTestCaseId, setSelectedTestCaseId] = useState<number | null>(null);
    
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }, [agentThoughts]);

    const logThought = (msg: string) => setAgentThoughts(prev => [...prev, `[${new Date().toLocaleTimeString()}] > ${msg}`]);

    const updateTierState = (tier: Tier, updates: Partial<typeof tierStates[Tier]>) => {
        setTierStates(prev => ({ ...prev, [tier]: { ...prev[tier], ...updates } }));
    };

    const runTestCase = async (tier: Tier, testCase: any) => {
        const suite = tierStates[tier].testSuite;
        if (!suite) return;

        updateTierState(tier, { 
            testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: 'running', output: '' } } 
        });

        const testScript = `
${code}

# AI Test Runner Wrapper
try:
    import json
    result = ${suite.functionName}(*${JSON.stringify(testCase.input)})
    expected = ${JSON.stringify(testCase.expectedOutput)}
    
    if result == expected:
        print("PASS")
    else:
        print(f"FAIL: expected {expected}, got {result}")
except Exception as e:
    if str("${testCase.expectedOutput}") == "error":
        print("PASS")
    else:
        print(f"ERROR: {str(e)}")
`;

        try {
            const res = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: testScript, language_id: 71 })
            });
            const data = await res.json();
            const output = data.stdout || data.stderr || data.compile_output || "";
            const isPass = output.includes("PASS");
            
            updateTierState(tier, { 
                testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: isPass ? 'pass' : 'fail', output } } 
            });
        } catch (e) {
            updateTierState(tier, { 
                testResults: { ...tierStates[tier].testResults, [testCase.id]: { status: 'error', output: 'Execution failed' } } 
            });
        }
    };

    const runSingleMission = async (tier: Tier, projectContext: string) => {
        updateTierState(tier, { phase: 'scouting', status: 'active', testResults: {} });
        logThought(`[${tier.toUpperCase()}] Scouting mission starting...`);
        
        try {
            // PHASE 2: SCOUTING
            const scoutRes = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'scout', code, context: projectContext, tier })
            });
            const scoutData = await scoutRes.json();
            updateTierState(tier, { phase: 'scripting', findings: scoutData.strategy || [] });
            
            // SPECIAL PHASE: TEST GENERATION (For Unit Tier)
            if (tier === 'unit') {
                logThought(`[UNIT] Deep Analysis: Generating 8-10 targeted test cases...`);
                const genRes = await fetch('/api/generate-tests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const genData = await genRes.json();
                updateTierState(tier, { testSuite: genData });
                logThought(`[UNIT] Test Suite Ready: ${genData.testCases.length} cases generated.`);
            }

            logThought(`[${tier.toUpperCase()}] Logic strategy acquired. Authoring proofs...`);

            // PHASE 3: SCRIPTING
            const scriptRes = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phase: 'script', code, context: projectContext })
            });
            const scriptData = await scriptRes.json();
            updateTierState(tier, { phase: 'verifying' });
            logThought(`[${tier.toUpperCase()}] Executing verification suite...`);

            // PHASE 4: VERIFICATION
            const verifyRes = await fetch('/api/run-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: scriptData.testSuite, language_id: 71 })
            });
            const verifyData = await verifyRes.json();
            const log = verifyData.stdout || verifyData.stderr || verifyData.compile_output;
            updateTierState(tier, { phase: 'complete', status: 'complete', logs: log });
            logThought(`[${tier.toUpperCase()}] Mission finalized.`);

        } catch (error: any) {
            logThought(`[${tier.toUpperCase()}] FAILED: ${error.message}`);
            updateTierState(tier, { status: 'pending', phase: 'idle' });
        }
    };

    const executeFullMission = async () => {
        setIsGlobalMission(true);
        setAgentThoughts([`[SYSTEM] INITIALIZING HIGH-DENSITY MISSION HUB...`]);
        setHealthScore(0);

        try {
            logThought(`INGESTION: Deep project-context scan initiating...`);
            const projectContext = repoFullName ? await getDeepProjectContext(repoFullName) : "";
            logThought(`READY: Project vision calibrated. Launching tier agents...`);

            if (activeTier === 'all') {
                for (const tier of TIERS) {
                    await runSingleMission(tier, projectContext);
                }
            } else {
                await runSingleMission(activeTier, projectContext);
            }

            setHealthScore(Math.floor(Math.random() * 40) + 60); // Simulated health calculation
            onNotify("Mission Grid complete.", "success");

        } catch (error: any) {
            onNotify(error.message, "error");
        } finally {
            setIsGlobalMission(false);
        }
    };

    const resetMissions = () => {
        setTierStates({
            unit: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            integration: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            security: { phase: 'idle', findings: [], logs: '', status: 'pending' },
            performance: { phase: 'idle', findings: [], logs: '', status: 'pending' },
        });
        setAgentThoughts([]);
        setHealthScore(0);
    };

    const stats = {
        passed: Object.values(tierStates).filter(t => t.status === 'complete').length,
        errors: Object.values(tierStates).filter(t => (t.logs || "").toLowerCase().includes('failed') || (t.logs || "").toLowerCase().includes('error')).length,
        total: TIERS.length
    };

    const isAnyMissionActiveOrComplete = Object.values(tierStates).some(s => s.status !== 'pending');

    return (
        <div className="h-full flex flex-col space-y-6 font-vscode-ui animate-in fade-in duration-500 overflow-hidden relative @container">
            
            {/* FOCUSED MISSION BOARD (OVERLAY) */}
            {focusedTier && (
                <div className="absolute inset-0 z-[60] bg-[#0c0c0e]/95 backdrop-blur-2xl p-4 sm:p-10 flex flex-col @md:flex-row animate-in zoom-in-95 duration-300 overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex flex-col @lg:flex-row @lg:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center space-x-4">
                                <button onClick={() => setFocusedTier(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-textSecondary">
                                    <ChevronRight className="rotate-180" size={24} />
                                </button>
                                <div>
                                    <h1 className="text-xl @lg:text-2xl font-black text-textPrimary uppercase tracking-tight truncate">Mission: {focusedTier}</h1>
                                    <p className="text-[10px] text-textSecondary font-bold uppercase tracking-widest opacity-60">Architectural Proving Grounds</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => {
                                        const cases = tierStates[focusedTier].testSuite?.testCases;
                                        if (cases) cases.forEach(c => runTestCase(focusedTier, c));
                                    }}
                                    className="bg-highlight text-black px-4 @lg:px-6 py-2 rounded-xl text-[9px] @lg:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-highlight/20 whitespace-nowrap"
                                >
                                    Run All
                                </button>
                                <button onClick={() => setFocusedTier(null)} className="text-[10px] font-black uppercase text-textSecondary hover:text-white px-2">Close</button>
                            </div>
                        </div>

                        {/* TEST CASE LISTING - RESPONSIVE GRID */}
                        <div className="flex-1 grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-4 @lg:gap-6 overflow-y-auto custom-scrollbar p-2">
                            {tierStates[focusedTier].testSuite?.testCases.map((tc: any) => (
                                <div 
                                    key={tc.id} 
                                    onClick={() => setSelectedTestCaseId(tc.id)}
                                    className={`bg-cardPanel/60 border rounded-2xl p-4 @lg:p-5 flex flex-col space-y-4 transition-all group cursor-pointer h-fit ${selectedTestCaseId === tc.id ? 'border-highlight ring-1 ring-highlight/50' : 'border-white/5 hover:border-highlight/30'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div className="text-[8px] font-black bg-highlight/10 text-highlight px-2 py-0.5 rounded uppercase">{tc.type}</div>
                                            <span className="text-[10px] font-bold text-textPrimary">Case #{tc.id}</span>
                                        </div>
                                        {tierStates[focusedTier].testResults?.[tc.id] && (
                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                tierStates[focusedTier].testResults?.[tc.id].status === 'pass' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                tierStates[focusedTier].testResults?.[tc.id].status === 'running' ? 'bg-highlight/10 text-highlight' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {tierStates[focusedTier].testResults?.[tc.id].status}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-textSecondary font-medium leading-relaxed line-clamp-2">{tc.description}</p>
                                    <div className="flex-1 bg-black/40 rounded-xl p-3 font-mono text-[9px] text-textSecondary overflow-hidden">
                                        <div className="mb-2 uppercase text-white/20 text-[7px] font-black tracking-widest">Input</div>
                                        <div className="text-highlight/80 truncate">{JSON.stringify(tc.input)}</div>
                                        <div className="mt-3 mb-1 uppercase text-white/20 text-[7px] font-black tracking-widest">Expected</div>
                                        <div className="text-green-500/80 truncate">{JSON.stringify(tc.expectedOutput)}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); runTestCase(focusedTier, tc); }}
                                        className={`w-full py-2 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedTestCaseId === tc.id ? 'bg-highlight text-black' : 'group-hover:bg-highlight group-hover:text-black'}`}
                                    >
                                        Verify Proof
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LONE WOLF: ISOLATED PROOF CONSOLE */}
                    {selectedTestCaseId && (
                        <div className="mt-4 @md:mt-0 @md:ml-6 w-full @md:w-[300px] @lg:w-[350px] bg-[#0c0c0e] border border-highlight/20 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 shadow-2xl shrink-0">
                            <div className="p-4 @lg:p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <TerminalIcon size={14} className="text-highlight" />
                                    <span className="text-[9px] @lg:text-[10px] font-black text-textPrimary uppercase tracking-widest">Isolated Console</span>
                                </div>
                                <button onClick={() => setSelectedTestCaseId(null)} className="text-textSecondary hover:text-white transition-colors">
                                    <Boxes size={14} />
                                </button>
                            </div>
                            <div className="flex-1 p-4 @lg:p-6 font-mono text-[10px] space-y-4 overflow-y-auto custom-scrollbar">
                                <div>
                                    <div className="text-white/20 text-[7px] font-black uppercase tracking-widest mb-1.5">Strategy</div>
                                    <div className="text-textPrimary leading-relaxed">
                                        {tierStates[focusedTier].testSuite?.testCases.find(tc => tc.id === selectedTestCaseId)?.description}
                                    </div>
                                </div>
                                <div className="p-4 bg-black/60 rounded-xl border border-white/5">
                                    <div className="text-white/20 text-[7px] font-black uppercase tracking-widest mb-2">EVIDENCE (STDOUT)</div>
                                    <div className="text-green-400/80 whitespace-pre-wrap flex items-center">
                                        {tierStates[focusedTier].testResults?.[selectedTestCaseId]?.status === 'running' ? (
                                            <span className="animate-pulse">Waiting for proofs...</span>
                                        ) : (
                                            tierStates[focusedTier].testResults?.[selectedTestCaseId]?.output || "Ready."
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TOP DASHBOARD: HEALTH & BRANDING */}
            <div className="flex flex-col @lg:flex-row items-center gap-6 bg-cardPanel/40 backdrop-blur-xl p-6 @lg:p-8 rounded-3xl border border-borderLine shadow-2xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-highlight/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                
                <div className="relative w-28 h-28 @lg:w-36 @lg:h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="40%" className="stroke-white/5 fill-none" strokeWidth="8" />
                        <circle 
                            cx="50%" cy="50%" r="40%" 
                            className="stroke-highlight transition-all duration-1000 fill-none" 
                            strokeWidth="8" 
                            strokeDasharray="251.2%"
                            strokeDashoffset={`${251.2 * (1 - healthScore / 100)}%`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl @lg:text-3xl font-black text-white">{healthScore}%</span>
                        <span className="text-[8px] @lg:text-[10px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Health</span>
                    </div>
                </div>

                <div className="flex-1 w-full space-y-4 relative z-10">
                    <div className="flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-4">
                        <div className="text-center @lg:text-left">
                            <div className="flex flex-wrap items-center justify-center @lg:justify-start gap-2 mb-1">
                                <h1 className="text-xl @lg:text-2xl font-black text-textPrimary tracking-tight uppercase">CodeShield Agent</h1>
                                <span className="bg-highlight/20 text-highlight text-[8px] @lg:text-[10px] font-black px-2 @lg:px-3 py-1 rounded-full border border-highlight/20 uppercase tracking-widest leading-none">Grade A-</span>
                            </div>
                            <p className="text-[10px] @lg:text-xs text-textSecondary font-medium max-w-[400px]">AI Quality Inspector — analyzing architectural logic & cross-tier security vulnerabilities.</p>
                        </div>
                        
                        <div className="bg-[#0c0c0e]/80 border border-borderLine rounded-2xl px-4 @lg:px-6 py-2 @lg:py-3 flex items-center justify-around shadow-inner min-w-[200px]">
                            <div className="text-center px-2">
                                <div className="text-xs @lg:text-sm font-black text-green-500">{stats.passed}</div>
                                <div className="text-[7px] @lg:text-[8px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Passed</div>
                            </div>
                            <div className="text-center border-x border-white/5 px-4 @lg:px-6">
                                <div className="text-xs @lg:text-sm font-black text-red-500">{stats.errors}</div>
                                <div className="text-[7px] @lg:text-[8px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Errors</div>
                            </div>
                            <div className="text-center px-2">
                                <div className="text-xs @lg:text-sm font-black text-highlight">{stats.total}</div>
                                <div className="text-[7px] @lg:text-[8px] font-bold text-textSecondary uppercase tracking-widest opacity-60">Missions</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION LAYER (OPTIONS): HIDDEN WHEN MISSION IS ACTIVE/DONE */}
            {!isAnyMissionActiveOrComplete ? (
                <div className="flex flex-col @2xl:flex-row items-center justify-between gap-4 bg-cardPanel/60 backdrop-blur-lg p-4 @lg:p-5 rounded-2xl border border-borderLine shrink-0 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1 w-full @2xl:w-auto">
                        {['all', ...TIERS].map((t) => (
                            <button
                                key={t}
                                onClick={() => setActiveTier(t as any)}
                                className={`px-4 @lg:px-6 py-2 rounded-xl text-[8px] @lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTier === t ? 'bg-highlight text-black shadow-lg shadow-highlight/20' : 'bg-white/5 text-textSecondary hover:bg-white/10 hover:text-white'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={executeFullMission}
                        disabled={isGlobalMission}
                        className="w-full @2xl:w-auto bg-highlight ring-4 ring-highlight/10 hover:ring-highlight/20 hover:scale-[1.02] text-black px-8 @lg:px-10 py-3 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98] disabled:opacity-30"
                    >
                        {isGlobalMission ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                        <span className="text-[10px] @lg:text-[12px] font-black uppercase tracking-[0.1em]">Execute MISSION</span>
                    </button>
                </div>
            ) : (
                /* Header visible only when results are showing */
                <div className="flex items-center justify-between px-2 shrink-0 animate-in fade-in duration-700">
                    <div className="flex items-center space-x-2">
                        <div className="w-1 h-4 bg-highlight rounded-full" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Active Deployment Results</h3>
                    </div>
                    <button 
                        onClick={resetMissions}
                        className="text-[9px] font-black uppercase tracking-widest text-highlight border border-highlight/20 px-4 py-1.5 rounded-lg hover:bg-highlight hover:text-black transition-all"
                    >
                        New Mission
                    </button>
                </div>
            )}

            {/* RESULTS GRID: VISIBLE ONLY WHEN RESULTS EXIST */}
            {isAnyMissionActiveOrComplete && (
                <div className={`flex-1 grid gap-4 min-h-0 overflow-y-auto custom-scrollbar p-1 animate-in zoom-in-95 duration-500 ${activeTier === 'all' ? 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : 'grid-cols-1'}`}>
                    {(activeTier === 'all' || activeTier === 'unit') && tierStates.unit.status !== 'pending' && (
                        <MissionCard tier="unit" icon={<Cpu size={20} />} state={tierStates.unit} onSmartFix={onSmartFix} onFocused={() => setFocusedTier('unit')} />
                    )}
                    {(activeTier === 'all' || activeTier === 'integration') && tierStates.integration.status !== 'pending' && (
                        <MissionCard tier="integrations" icon={<Network size={20} />} state={tierStates.integration} onSmartFix={onSmartFix} onFocused={() => setFocusedTier('integration')} />
                    )}
                    {(activeTier === 'all' || activeTier === 'security') && tierStates.security.status !== 'pending' && (
                        <MissionCard tier="security & risk" icon={<ShieldAlert size={20} />} state={tierStates.security} onSmartFix={onSmartFix} onFocused={() => setFocusedTier('security')} />
                    )}
                    {(activeTier === 'all' || activeTier === 'performance') && tierStates.performance.status !== 'pending' && (
                        <MissionCard tier="efficiency & perf" icon={<ZapFilled size={20} />} state={tierStates.performance} onSmartFix={onSmartFix} onFocused={() => setFocusedTier('performance')} />
                    )}
                </div>
            )}

            {/* DIAGNOSTIC DRAWER */}
            <div className={`absolute bottom-0 left-0 right-0 transition-transform duration-500 z-50 ${isTraceOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'}`}>
                <div className="bg-[#0c0c0e] border-t border-borderLine shadow-2xl h-[300px] flex flex-col">
                    <button 
                        onClick={() => setIsTraceOpen(!isTraceOpen)}
                        className="h-10 border-b border-white/5 bg-white/5 flex items-center justify-center hover:bg-highlight/5 transition-colors"
                    >
                        <div className="flex items-center space-x-2 text-[9px] font-black text-textSecondary uppercase tracking-widest">
                            {isTraceOpen ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} className="-rotate-90" />}
                            <span>Log Diagnostic Trace</span>
                        </div>
                    </button>
                    <div ref={feedRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[10px] text-highlight space-y-1">
                        {agentThoughts.map((t, i) => <div key={i}>{t}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MissionCard = ({ tier, icon, state, onSmartFix, onFocused }: { tier: string, icon: React.ReactNode, state: any, onSmartFix: any, onFocused: () => void }) => {
    const isError = (state.logs || "").toLowerCase().includes('failed') || (state.logs || "").toLowerCase().includes('error');
    
    return (
        <div className={`p-6 bg-cardPanel/60 rounded-3xl border transition-all duration-500 flex flex-col space-y-4 hover:bg-cardPanel/80 ${state.status === 'active' ? 'border-highlight shadow-[0_0_50px_-15px_rgba(var(--highlight-rgb),0.3)] ring-1 ring-highlight/50 scale-[0.99]' : 'border-borderLine shadow-xl grayscale-[0.5] opacity-80 hover:grayscale-0 hover:opacity-100'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${state.status === 'active' ? 'bg-highlight text-black' : 'bg-white/5 text-highlight'}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-textPrimary leading-none mb-1">{tier}</h3>
                        <div className="text-[9px] font-bold text-textSecondary uppercase tracking-tighter opacity-60">Verified Exploration</div>
                    </div>
                </div>
                {state.status === 'complete' && (
                     <CheckCircle2 size={18} className={isError ? "text-red-500" : "text-green-500"} />
                )}
                {state.status === 'active' && (
                     <Loader2 size={18} className="text-highlight animate-spin" />
                )}
            </div>

            <div className="flex-1 min-h-[100px] border border-white/5 bg-black/40 rounded-2xl p-4 font-mono text-[9px] text-textSecondary overflow-y-auto custom-scrollbar relative">
                <div className="space-y-1">
                    {state.phase !== 'complete' && <div className="text-highlight animate-pulse flex items-center"><Sparkles size={8} className="mr-1.5" /> Agent is exploring code context...</div>}
                    {state.findings.slice(0, 3).map((f: any, i: number) => (
                        <div key={i} className="flex items-start space-x-2 border-l-2 border-white/10 pl-3 py-1 my-2">
                            <div className="h-1 w-1 rounded-full bg-highlight mt-1" />
                            <div className="flex-1">
                                <span className="text-textPrimary font-bold">{f.label}:</span>
                                <span className="ml-1 opacity-70 italic">{f.intent}</span>
                            </div>
                        </div>
                    ))}
                    {state.logs && <div className={`mt-4 p-2 rounded bg-black/60 border border-white/5 text-[8px] whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-green-400'}`}>{state.logs}</div>}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-1.5 text-textSecondary hover:text-highlight cursor-pointer" onClick={onFocused}>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${state.status === 'complete' ? (isError ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500') : 'bg-white/5'}`}>
                         {state.status === 'active' ? state.phase : (state.testSuite ? 'View Mission Results' : state.status)}
                    </div>
                    {state.testSuite && <ChevronRight size={14} className="animate-pulse" />}
                </div>
                {isError && (
                    <button 
                        onClick={onSmartFix}
                        className="flex items-center space-x-1.5 text-highlight hover:bg-highlight/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                        <ZapIcon size={12} fill="currentColor" />
                        <span>Heal Tier</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default QualityAudit;
