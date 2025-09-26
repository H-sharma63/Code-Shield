'use client';

import { useState } from 'react';
import * as monaco from 'monaco-editor';

interface SearchProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: monaco.editor.FindMatch[];
    goToMatch: (match: monaco.editor.FindMatch) => void;
}

const Search = ({ searchQuery, setSearchQuery, searchResults, goToMatch }: SearchProps) => {
    return (
        <div className="h-full bg-cardPanel mt-[14px] rounded-lg p-4 flex flex-col">
            <h2 className="text-lg font-bold mb-2 text-textPrimary">Search</h2>
            <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 rounded-[20px] bg-borderLine text-textPrimary"
            />
            <div className="mt-4 overflow-y-auto flex-1">
                {searchResults.length > 0 ? (
                    searchResults.map((match, index) => (
                        <div
                            key={index}
                            className="p-2 mb-1 bg-cardBackground rounded-md cursor-pointer hover:bg-highlight/20"
                            onClick={() => goToMatch(match)}
                        >
                            <span className="font-bold text-textPrimary">{match.range.startLineNumber}:</span>{' '}
                            <span className="text-textSecondary">{match.matches?.[0] ?? ''}</span>
                        </div>
                    ))
                ) : (
                    searchQuery && <p className="text-textSecondary">No results found.</p>
                )}
            </div>
        </div>
    );
};

export default Search;
