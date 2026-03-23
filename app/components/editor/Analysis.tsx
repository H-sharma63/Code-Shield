'use client';

import { Download } from 'lucide-react';

interface AnalysisProps {
    analysis: {
        explanation: string;
        suggestions: string[];
        model: string;
    } | null;
    isAnalyzing: boolean;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
}

const Analysis = ({ analysis, isAnalyzing, selectedModel, setSelectedModel }: AnalysisProps) => {
    const handleDownload = () => {
        if (!analysis) return;

        const reportContent = `
Code Analysis Report
======================
Model: ${analysis.model}

Code Explanation:
-----------------
${analysis.explanation}

Suggestions for Improvement:
---------------------------
${Array.isArray(analysis.suggestions) ? analysis.suggestions.map(suggestion => `- ${suggestion}`).join('\n') : 'No suggestions available.'}
`;

        const blob = new Blob([reportContent.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis-report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full mt-[14px] flex flex-col space-y-4">
            {/* DYNAMIC HEADER CONFIG */}
            <div className="bg-cardPanel rounded-lg p-4 border border-borderLine shrink-0 flex flex-col space-y-3">
                <div className="flex justify-between items-start w-full">
                    <div className="flex flex-col">
                        <h2 className="text-[11px] font-bold text-textSecondary uppercase tracking-widest">Model Config</h2>
                        <span className="text-[10px] text-highlight/80 font-mono mt-1">{analysis ? `Last: ${analysis.model}` : 'Ready to analyze'}</span>
                    </div>
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

                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-base text-textPrimary text-xs rounded-lg p-2.5 outline-none border border-borderLine focus:border-highlight transition-all cursor-pointer shadow-inner"
                >
                    <optgroup label="Functional Models">
                        <option value="mistral-codestral2">Mistral Codestral 2</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                        <option value="gemini-test">Gemini 2.0 Flash</option>
                    </optgroup>
                    <optgroup label="Claude Models (Temporarily Unavailable)" style={{ opacity: 0.3 }}>
                        <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                        <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                        <option value="claude-4.0-opus">Claude 4.0 Opus</option>
                        <option value="claude-4.1-opus">Claude 4.1 Opus</option>
                    </optgroup>
                </select>
            </div>

            {/* RESULTS AREA */}
            <div className="bg-cardPanel rounded-lg p-4 flex-1 overflow-hidden flex flex-col border border-borderLine">
                <h3 className="text-[12px] font-bold text-textSecondary uppercase tracking-widest mb-4">Analysis Results</h3>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3">
                            <div className="w-8 h-8 border-2 border-highlight/20 border-t-highlight rounded-full animate-spin" />
                            <p className="text-textSecondary text-xs animate-pulse">Consulting {selectedModel}...</p>
                        </div>
                    ) : analysis && analysis.suggestions ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[13px] font-bold text-textPrimary mb-2 underline decoration-highlight/30 underline-offset-4">Logic Explanation</h4>
                                <p className="text-[12px] text-textSecondary leading-relaxed">{analysis.explanation}</p>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-textPrimary mb-2 underline decoration-highlight/30 underline-offset-4">Suggestions</h4>
                                <ul className="space-y-2">
                                    {analysis.suggestions.map((suggestion, index) => (
                                        <li key={index} className="text-xs text-textSecondary flex items-start space-x-2">
                                            <span className="text-highlight mt-1">•</span>
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-borderLine rounded-xl">
                            <p className="text-textSecondary text-xs italic">Select a model and click the lightning icon above to start the review process.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analysis;
