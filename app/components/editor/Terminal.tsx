'use client';

import { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  output: string | null;
  stdin: string;
  setStdin: (stdin: string) => void;
}

const Terminal = ({ output, stdin, setStdin }: TerminalProps) => {
    const [currentInput, setCurrentInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentInput(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setStdin(stdin + currentInput + '\n');
            setCurrentInput("");
        }
    };

    return (
        <div className="h-full bg-cardPanel rounded-none border-t border-borderLine flex flex-col font-mono text-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-borderLine bg-[#121214]">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-textSecondary">System Terminal</h2>
            </div>
            <div 
                ref={scrollRef}
                className="flex-1 p-4 overflow-y-auto custom-scrollbar"
            >
                <pre className="text-textSecondary whitespace-pre-wrap">{output || 'Execution output will appear here...'}</pre>
                <div className="flex items-center mt-2">
                    <span className="text-green-500 font-bold mr-2">➜</span>
                    <input 
                        type="text"
                        className="bg-transparent text-textPrimary outline-none flex-1 border-none focus:ring-0 p-0 text-sm"
                        value={currentInput}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Enter stdin..."
                    />
                </div>
            </div>
        </div>
    );
};

export default Terminal;
