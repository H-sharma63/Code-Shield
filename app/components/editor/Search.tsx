interface SearchResult {
    path: string;
    name: string;
    matches: { line: number; text: string }[];
}

interface SearchProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: SearchResult[];
    isSearching: boolean;
    onResultClick: (path: string, line: number) => void;
}

const Search = ({ searchQuery, setSearchQuery, searchResults, isSearching, onResultClick }: SearchProps) => {
    return (
        <div className="h-full bg-transparent p-5 flex flex-col space-y-4 font-vscode-ui">
            <h2 className="text-[12px] font-black text-textSecondary uppercase tracking-[0.2em] mb-2 shrink-0">Global Search</h2>
            
            <div className="relative shrink-0">
                <input
                    type="text"
                    placeholder="Search in whole project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2.5 pl-4 rounded-xl bg-base/50 text-textPrimary text-xs border border-white/5 focus:border-highlight/50 outline-none transition-all placeholder:text-textSecondary/40"
                    autoFocus
                />
                {isSearching && (
                    <div className="absolute right-3 top-2.5">
                        <div className="w-4 h-4 border-2 border-highlight/10 border-t-highlight rounded-full animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-60">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-textSecondary animate-pulse">Scanning Repository...</p>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-4">
                        {searchResults.map((result, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center space-x-2 text-highlight/80 px-1">
                                    <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[200px]">{result.path}</span>
                                    <span className="text-[9px] font-bold text-textSecondary opacity-40">({result.matches.length})</span>
                                </div>
                                <div className="space-y-0.5">
                                    {result.matches.map((match, mIdx) => (
                                        <button
                                            key={mIdx}
                                            onClick={() => onResultClick(result.path, match.line)}
                                            className="w-full text-left p-2 rounded-md hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5 flex items-start space-x-3"
                                        >
                                            <span className="text-[10px] font-vscode-mono text-textSecondary/50 group-hover:text-highlight transition-colors min-w-[20px] pt-0.5">{match.line || idx}</span>
                                            <span className="text-[11px] text-textSecondary group-hover:text-textPrimary transition-colors truncate font-medium">
                                                {match.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    searchQuery && !isSearching && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center p-6 grayscale">
                             <p className="text-textSecondary text-xs italic">No project-wide matches found for "{searchQuery}".</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Search;
