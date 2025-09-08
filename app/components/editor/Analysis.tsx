'use client';

const Analysis = () => {
    return (
        <div className="h-calc(100% - 10px) mt-[14px] flex flex-col space-y-4">
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Code Analysis</h2>
                <p className="text-textSecondary">Suggestions and error fixes will appear here.</p>
            </div>
            <div className="bg-cardPanel rounded-lg p-4 flex-1">
                <h2 className="text-lg font-bold mb-2 text-textPrimary">Code Explanation</h2>
                <p className="text-textSecondary">A description of what the code does will appear here.</p>
            </div>
        </div>
    );
};

export default Analysis;
