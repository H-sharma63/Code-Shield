'use client';

interface AnalysisProps {
    analysis: {
        explanation: string;
        suggestions: string[];
        model: string;
    } | null;
    isAnalyzing: boolean;
}

const Analysis = ({ analysis, isAnalyzing }: AnalysisProps) => {
    return (
        <div className="h-calc(100% - 10px) mt-[14px] flex flex-col space-y-4">
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Code Analysis {analysis ? `using ${analysis.model}` : ''}</h2>
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