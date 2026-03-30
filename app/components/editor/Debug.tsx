'use client';

import { Download } from 'lucide-react';

interface DebugProps {
  analysis: {
    explanation: string;
    suggestions: string[];
  } | null;
  isAnalyzing: boolean;
  onDebug: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const Debug = ({ analysis, isAnalyzing, onDebug, selectedModel, setSelectedModel }: DebugProps) => {
    // ... handleDownload remains same ...

    return (
        <div className="h-full p-5 flex flex-col space-y-4 @container animate-in fade-in duration-500 overflow-hidden">
            <h2 className="text-[12px] font-black text-textSecondary uppercase tracking-[0.2em] mb-2 shrink-0">Debug</h2>
            <div className="bg-white/5 rounded-xl p-4 @lg:p-5 border border-white/5 shadow-lg shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[11px] font-bold text-textSecondary uppercase tracking-widest truncate">Model Config</h3>
                    <div className="flex items-center space-x-2">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-base text-textPrimary text-xs rounded-lg p-2.5 outline-none border border-borderLine focus:border-highlight transition-all cursor-pointer shadow-inner"
                        >
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                            <option value="mistral-codestral2">Mistral Codestral 2</option>
                        </select>
                        {analysis && (
                            <button
                                onClick={handleDownload}
                                title="Download Report"
                                className="p-2 bg-white/5 hover:bg-highlight/20 text-textPrimary hover:text-highlight rounded-lg transition-all"
                            >
                                <Download size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <button
                    onClick={onDebug}
                    className="bg-primary hover:bg-highlight text-white font-bold py-2 px-4 rounded w-full shrink-0"
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? 'Debugging...' : 'Get Debugging Suggestions'}
                </button>
                {analysis && analysis.suggestions && (
                    <ul className="text-textSecondary list-disc pl-5 space-y-2 mt-4 overflow-y-auto flex-1">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="bg-cardPanel rounded-lg p-4 flex-1 overflow-hidden flex flex-col border border-borderLine">
                <h3 className="text-[12px] font-bold text-textSecondary uppercase tracking-widest mb-4">Explanation</h3>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3">
                            <div className="w-8 h-8 border-2 border-highlight/20 border-t-highlight rounded-full animate-spin" />
                            <p className="text-textSecondary text-xs animate-pulse">Consulting {selectedModel}...</p>
                        </div>
                    ) : analysis ? (
                        <p className="text-xs text-textSecondary leading-relaxed">{analysis.explanation}</p>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-borderLine rounded-xl">
                            <p className="text-textSecondary text-xs italic">Click "Get Debugging Suggestions" to start the process.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Debug;