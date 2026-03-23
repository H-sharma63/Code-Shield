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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-textPrimary">Debug</h2>
                    <div className="flex items-center space-x-2">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="bg-base text-textPrimary text-xs rounded p-1 outline-none border border-borderLine"
                        >
                            <optgroup label="Vertex AI (Free Credits)">
                                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="claude-4.0-opus">Claude 4.0 Opus</option>
                                <option value="claude-4.1-opus">Claude 4.1 Opus</option>
                                <option value="mistral-codestral2">Mistral Codestral 2</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                                <option value="gemini-test">Gemini 2.0 Flash</option>
                            </optgroup>
                            <optgroup label="OpenRouter (Free Models)">
                                <option value="qwen/qwen3-coder:free">Qwen3 Coder (Free)</option>
                                <option value="openai/gpt-oss-120b:free">GPT-OSS 120B (Free)</option>
                                <option value="deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
                            </optgroup>
                        </select>
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
                </div>
                <button
                    onClick={onDebug}
                    className="bg-primary hover:bg-highlight text-white font-bold py-2 px-4 rounded w-full"
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