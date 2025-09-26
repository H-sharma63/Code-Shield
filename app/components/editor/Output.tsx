'use client';

interface OutputProps {
  output: string | null;
}

const Output = ({ output }: OutputProps) => {
    return (
        <div className="h-full bg-cardPanel mt-[14px] rounded-lg p-4">
            <h2 className="text-lg font-bold mb-2 text-textPrimary">Output</h2>
            <pre className="text-textSecondary whitespace-pre-wrap">{output || 'Output will be displayed here.'}</pre>
        </div>
    );
};

export default Output;
