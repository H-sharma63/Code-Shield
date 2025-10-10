'use client';

interface DebugProps {
  analysis: {
    explanation: string;
    suggestions: string[];
  } | null;
  isAnalyzing: boolean;
  onDebug: () => void;
}

const Debug = ({ analysis, isAnalyzing, onDebug }: DebugProps) => {
    return (
        <div className="h-calc(100% - 10px) mt-[14px] flex flex-col space-y-4">
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Debug</h2>
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