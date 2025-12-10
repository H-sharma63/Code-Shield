'use client';

import { Download } from 'lucide-react';

interface AnalysisProps {
    analysis: {
        explanation: string;
        suggestions: string[];
        model: string;
    } | null;
    isAnalyzing: boolean;
}

const Analysis = ({ analysis, isAnalyzing }: AnalysisProps) => {
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
        <div className="h-calc(100% - 10px) mt-[14px] flex flex-col space-y-4">
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold text-textPrimary">Code Analysis {analysis ? `using ${analysis.model}` : ''}</h2>
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
                {isAnalyzing ? (
                    <p className="text-textSecondary">Analyzing...</p>
                ) : analysis && analysis.suggestions ? (
                    <ul className="text-textSecondary list-disc pl-5 space-y-2">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-textSecondary">Suggestions and error fixes will appear here.</p>
                )}
            </div>
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Code Explanation</h2>
                {isAnalyzing ? (
                    <p className="text-textSecondary">Analyzing...</p>
                ) : analysis ? (
                    <p className="text-textSecondary">{analysis.explanation}</p>
                ) : (
                    <p className="text-textSecondary">A description of what the code does will appear here.</p>
                )}
            </div>
        </div>
    );
};

export default Analysis;