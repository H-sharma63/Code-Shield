'use client';

import { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  output: string | null;
  stdin: string;
  setStdin: (stdin: string) => void;
}

const Terminal = ({ output, stdin, setStdin }: TerminalProps) => {
    const [history, setHistory] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (output) {
            setHistory(prev => [...prev, output]);
        }
    }, [output]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [history]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentInput(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const newHistory = [...history, `> ${currentInput}`];
            setHistory(newHistory);
            setStdin(`${stdin}${currentInput}\n`);
            setCurrentInput("");
        }
    };

    return (
        <div className="h-full bg-cardPanel mt-[14px] rounded-lg p-4 flex flex-col">
            <h2 className="text-lg font-bold mb-2 text-textPrimary">Terminal</h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar" onClick={() => inputRef.current?.focus()}>
                {history.map((line, index) => (
                    <div key={index} className="text-textSecondary whitespace-pre-wrap">{line}</div>
                ))}
                <div className="flex">
                    <span className="text-textSecondary">{`> `}</span>
                    <input 
                        ref={inputRef}
                        type="text"
                        className="bg-transparent text-textPrimary outline-none flex-1"
                        value={currentInput}
                        onChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                    />
                </div>
            </div>
        </div>
    );
};

export default Terminal;