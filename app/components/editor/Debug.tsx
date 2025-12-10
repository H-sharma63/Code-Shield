'use client';

import { Download } from 'lucide-react';

interface DebugProps {
  analysis: {
    explanation: string;
    suggestions: string[];
  } | null;
  isAnalyzing: boolean;
  onDebug: () => void;
}

const Debug = ({ analysis, isAnalyzing, onDebug }: DebugProps) => {
    const handleDownload = () => {
        if (!analysis) return;

        const reportContent = `
Debugging Analysis Report
=========================

Potential Issues Explanation:
-----------------------------
${analysis.explanation}

Debugging Suggestions:
----------------------
${Array.isArray(analysis.suggestions) ? analysis.suggestions.map(suggestion => `- ${suggestion}`).join('\n') : 'No suggestions available.'}
`;

        const blob = new Blob([reportContent.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'debug-report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-calc(100% - 10px) mt-[14px] flex flex-col space-y-4">
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold text-textPrimary">Debug</h2>
                    {analysis && (
                        <button
                            onClick={handleDownload}
                            title="Download Report"
                            className="bg-primaryAccent hover:opacity-80 text-white font-bold p-2 rounded-full"
                        >
                            <Download size={18} />
                        </button>
                    )}
                </div>
                <button
                    onClick={onDebug}
                    className="bg-primary hover:bg-highlight text-white font-bold py-2 px-4 rounded"
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? 'Debugging...' : 'Get Debugging Suggestions'}
                </button>
                {analysis && analysis.suggestions && (
                    <ul className="text-textSecondary list-disc pl-5 space-y-2 mt-4">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Explanation</h2>
                {analysis && (
                    <p className="text-textSecondary">{analysis.explanation}</p>
                )}
            </div>
        </div>
    );
};

export default Debug;