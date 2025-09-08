'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Play, Files, Search as SearchIcon, CheckSquare, Plus, Minus, SquareTerminal } from 'lucide-react';
import FileExplorer from '../components/editor/FileExplorer';
import Search from '../components/editor/Search';
import Analysis from '../components/editor/Analysis';
import Output from '../components/editor/Output';

const MOCK_FILE_SYSTEM: { [key: string]: { entries: { name: string; type: string; }[] } } = {
  ".": {
    entries: [
      { name: ".next", type: "directory" },
      { name: ".vscode", type: "directory" },
      { name: "app", type: "directory" },
      { name: "public", type: "directory" },
      { name: "types", type: "directory" },
      { name: ".gitignore", type: "file" },
      { name: "eslint.config.mjs", type: "file" },
      { name: "instrumentation-client.ts", type: "file" },
      { name: "instrumentation.ts", type: "file" },
      { name: "next.config.ts", type: "file" },
      { name: "package-lock.json", type: "file" },
      { name: "package.json", type: "file" },
      { name: "postcss.config.js", type: "file" },
      { name: "README.md", type: "file" },
      { name: "sentry.client.config.ts", type: "file" },
      { name: "sentry.edge.config.ts", type: "file" },
      { name: "sentry.server.config.ts", type: "file" },
      { name: "tailwind.config.js", type: "file" },
      { name: "tsconfig.json", type: "file" },
    ]
  },
  "app": {
    entries: [
      { name: "api", type: "directory" },
      { name: "components", type: "directory" },
      { name: "editor", type: "directory" },
      { name: "sentry-example-page", type: "directory" },
      { name: "admin", type: "directory" },
      { name: "favicon.ico", type: "file" },
      { name: "global-error.tsx", type: "file" },
      { name: "globals.css", type: "file" },
      { name: "layout.tsx", type: "file" },
      { name: "page.tsx", type: "file" },
      { name: "providers.tsx", type: "file" },
    ]
  },
  "app/editor": {
    entries: [
      { name: "page.tsx", type: "file" },
    ]
  },
  "app/api": {
    entries: [
      { name: "auth", type: "directory" },
      { name: "get-users", type: "directory" },
      { name: "log-user", type: "directory" },
      { name: "pusher", type: "directory" },
      { name: "sentry-example-api", type: "directory" },
    ]
  },
  "app/components": {
    entries: [
      { name: "ConditionalNavbar.tsx", type: "file" },
      { name: "LoginCard.tsx", type: "file" },
      { name: "Navbar.tsx", type: "file" },
      { name: "PusherContext.tsx", type: "file" },
      { name: "PusherProvider.tsx", type: "file" },
    ]
  },
  "public": {
    entries: [
      { name: "file.svg", type: "file" },
      { name: "globe.svg", type: "file" },
      { name: "next.svg", type: "file" },
      { name: "vercel.svg", type: "file" },
      { name: "window.svg", type: "file" },
      { name: "fonts", type: "directory" },
      { name: "workers", type: "directory" },
    ]
  },
  "types": {
    entries: [
      { name: "next-auth.d.ts", type: "file" },
    ]
  },
  // Add more mock data for other directories as needed
};

const MOCK_FILE_CONTENTS: { [key: string]: string } = {
  "README.md": "This is a mock README file content.\n\nThis content is loaded from MOCK_FILE_CONTENTS in app/editor/page.tsx.",
  "package.json": "{\n  \"name\": \"mock-project\",\n  \"version\": \"1.0.0\",\n  \"description\": \"A mock project for demonstration\",\n  \"main\": \"index.js\",\n  \"scripts\": {\n    \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"\n  },\n  \"author\": \"Gemini Agent\",\n  \"license\": \"MIT\"\n}",
  "app/editor/page.tsx": "// Mock content for app/editor/page.tsx\n\nconsole.log('This is a mock file loaded into the editor.');\n\n// You can edit this content, but changes will not be saved to disk.\n",
  "app/layout.tsx": "// Mock content for app/layout.tsx\n\nimport './globals.css';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html>\n      <body>{children}</body>\n    </html>\n  );\n}\n",
  "app/page.tsx": "// Mock content for app/page.tsx\n\nexport default function HomePage() {\n  return (\n    <div>\n      <h1>Welcome to the Mock Home Page!</h1>\n      <p>This content is from a mock file.</p>\n    </div>\n  );\n}\n",
  "app/globals.css": "/* Mock content for app/globals.css */\n\nbody {\n  font-family: sans-serif;\n}\n",
  "types/next-auth.d.ts": "// Mock content for types/next-auth.d.ts\n\ndeclare module \"next-auth\" {\n  interface Session {\n    user: {\n      id: string;\n      name: string;\n      email: string;\n    };\n  }\n}\n",
  // Add more mock file contents as needed
};

const mockListDirectory = async (path: string) => {
  const data = MOCK_FILE_SYSTEM[path];
  if (data) {
    return { list_directory_response: data };
  }
  return { list_directory_response: { entries: [] } };
};

const mockReadFile = async (absolute_path: string) => {
  const content = MOCK_FILE_CONTENTS[absolute_path];
  if (content) {
    return { read_file_response: { output: content } };
  }
  return { read_file_response: { output: `Mock content for ${absolute_path}` } };
};

const EditorPage = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorations = useRef<string[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<monaco.editor.FindMatch[]>([]);
  const [currentExplorerPath, setCurrentExplorerPath] = useState<string>('.'); // Start at project root
  const [explorerItems, setExplorerItems] = useState<any[]>([]); // Use any[] for treeData
  const [expanded, setExpanded] = useState<string[]>([]); // New state for expanded items
  const [fontSize, setFontSize] = useState(16); // Initial font size

  useEffect(() => {
    workerRef.current = new Worker('/workers/eslint.worker.js');

    workerRef.current.onmessage = (event) => {
      const { markers, version } = event.data;
      const model = editorRef.current?.getModel();
      if (model && model.getVersionId() === version) {
        monacoRef.current?.editor.setModelMarkers(model, 'eslint', markers);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Effect for search functionality
  useEffect(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current; // Get the monaco instance
    if (!editor || !monacoInstance) return; // Ensure both are available

    // Clear previous decorations
    decorations.current = editor.deltaDecorations(
      decorations.current,
      []
    );

    if (searchQuery) {
      const model = editor.getModel();
      if (!model) return; // Ensure model exists

      const matches = model.findMatches(
        searchQuery,
        false, // searchOnlyEditableRange
        false, // isRegex
        false, // matchCase
        null,  // wordSeparators
        true  // captureMatches
      );
      setSearchResults(matches); // Store matches in state

      const newDecorations = matches.map((match: monaco.editor.FindMatch) => ({
        range: match.range,
        options: {
          inlineClassName: 'my-search-match',
          stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }));

      decorations.current = editor.deltaDecorations(
        [],
        newDecorations
      );
    } else {
      // If searchQuery is empty, clear search results
      setSearchResults([]);
    }
  }, [searchQuery, editorRef.current, monacoRef.current]); // Add monacoRef.current to dependencies

  const fetchDirectoryContents = async (path: string) => {
    try {
      const result = await mockListDirectory(path);
      if (result.list_directory_response && result.list_directory_response.entries) {
        const items = result.list_directory_response.entries.map((entry: any) => {
          const fullPath = `${path === '.' ? '' : path}/${entry.name}`.replace(/^\//, '');
          return {
            id: fullPath,
            name: entry.name,
            isDir: entry.type === 'directory',
            children: entry.type === 'directory' ? [] : null,
          };
        });
        setExplorerItems(items);
      } else {
        setExplorerItems([]);
      }
    } catch (error) {
      console.error('Failed to list directory:', error);
      setExplorerItems([]);
    }
  };

  // Helper to find node by ID in tree data
  const findNodeById = (tree: any[], id: string): any | undefined => {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const updateTreeDataChildren = (tree: any[], nodeToUpdate: any, newChildren: any[]): any[] => {
    return tree.map((node) => {
      if (node.id === nodeToUpdate.id) { // Compare by ID
        return { ...node, children: newChildren };
      }
      if (node.children) {
        return { ...node, children: updateTreeDataChildren(node.children, nodeToUpdate, newChildren) };
      }
      return node;
    });
  };

  const onItemExpansionToggle = async (event: React.SyntheticEvent | null, itemId: string, isExpanded: boolean) => {
    const node = findNodeById(explorerItems, itemId);

    // Only load children if the node is a directory AND it's being expanded AND it doesn't have children loaded yet
    if (node && node.isDir && isExpanded && (!node.children || node.children.length === 0)) {
      try {
        const result = await mockListDirectory(node.id);
        if (result.list_directory_response && result.list_directory_response.entries) {
          const newChildren = result.list_directory_response.entries.map((entry: any) => {
            const fullPath = `${node.id}/${entry.name}`;
            return {
              id: fullPath,
              name: entry.name,
              isDir: entry.type === 'directory',
              children: entry.type === 'directory' ? [] : null,
            };
          });

          setExplorerItems(updateTreeDataChildren(explorerItems, node, newChildren));
        }
      } catch (error) {
        console.error('Failed to load directory children:', error);
      }
    }
  };

  const onItemSelectionToggle = (event: React.SyntheticEvent | null, itemId: string, isSelected: boolean) => {
    const node = findNodeById(explorerItems, itemId);
    if (node && !node.isDir) {
      handleFileClick(node.id);
    }
  };

  // Effect for file explorer functionality
  useEffect(() => {
    if (activeView === 'explorer') {
      fetchDirectoryContents(currentExplorerPath);
    }
  }, [activeView, currentExplorerPath]);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Set initial font size
    editor.updateOptions({ fontSize: fontSize });

    const model = editor.getModel();
    if (model) {
      const savedCode = localStorage.getItem('editor-content');
      if (savedCode) {
        model.setValue(savedCode);
      }

      const code = model.getValue();
      workerRef.current?.postMessage({ code, version: model.getVersionId() });

      model.onDidChangeContent(() => {
        const code = model.getValue();
        localStorage.setItem('editor-content', code);
        workerRef.current?.postMessage({ code, version: model.getVersionId() });
      });
    }
  };

  const handleRunCode = () => {
    // We'll implement the code execution logic here later.
    console.log('Running code...');
    setActiveView('analysis'); // Switch to analysis view on run
  };

  const handleIncreaseFontSize = () => {
    const newSize = fontSize + 2;
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const handleDecreaseFontSize = () => {
    const newSize = Math.max(8, fontSize - 2); // Prevent font size from going too small
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const handleFileClick = async (filePath: string) => {
    try {
      const result = await mockReadFile(filePath);
      if (result.read_file_response && result.read_file_response.output) {
        editorRef.current?.setValue(result.read_file_response.output);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const goToMatch = (match: monaco.editor.FindMatch) => {
    const editor = editorRef.current;
    if (editor) {
      editor.setPosition({
        lineNumber: match.range.startLineNumber,
        column: match.range.startColumn,
      });
      editor.revealRangeInCenterIfOutsideViewport(match.range);
      editor.focus();
    }
  };

  const renderActiveView = () => {
    if (!activeView) return null;
    const onPathChange = (newPath: string) => {
      setCurrentExplorerPath(newPath);
    };

    return (
      <div className="h-full relative">
        {activeView === 'explorer' && (
          <FileExplorer
            currentExplorerPath={currentExplorerPath}
            explorerItems={explorerItems}
            onItemExpansionToggle={onItemExpansionToggle}
            onItemSelectionToggle={onItemSelectionToggle}
            onPathChange={onPathChange}
            expandedItems={expanded} // Pass expanded state
            onExpandedItemsChange={(event, itemIds) => setExpanded(itemIds)} // Update expanded state
          />
        )}
        {activeView === 'search' && (
          <Search
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            goToMatch={goToMatch}
          />
        )}
        {activeView === 'analysis' && <Analysis />}
        {activeView === 'output' && <Output />}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <div className={activeView ? "w-3/5 h-full" : "w-full h-full"}>
        <div className="h-[30px] bg-base flex items-center justify-end pr-4">
          <button 
            onClick={handleIncreaseFontSize}
            className="text-textPrimary hover:text-highlight z-5"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={handleDecreaseFontSize}
            className="text-textSecondary hover:text-highlight z-5 ml-2"
          >
            <Minus size={18} />
          </button>
          <button 
            onClick={handleRunCode}
            className="text-textSecondary hover:text-borderLine z-5 ml-2" 
          >
            <Play size={22} />
          </button>
        </div>
        <Editor
          height="100%" // Adjust height to account for the 30px bar
          width="100%"
          defaultLanguage="javascript"
          onMount={handleEditorDidMount}
          theme="vs-dark"
        />
      </div>
      <div className={activeView ? "w-2/5 p-4 h-full" : "w-0 h-full"}>
        {renderActiveView()}
      </div>
      <div className="bg-base mt-[30px] p-2 flex flex-col items-center space-y-4 flex-grow h-full">
        <button onClick={() => setActiveView(activeView === 'explorer' ? null : 'explorer')} className={`text-textSecondary hover:text-textPrimary ${activeView === 'explorer' ? 'border-b-2 border-highlight' : ''}`}>
          <Files size={24} />
        </button>
        <button onClick={() => setActiveView(activeView === 'search' ? null : 'search')} className={`text-textSecondary hover:text-textPrimary ${activeView === 'search' ? 'border-b-2 border-highlight' : ''}`}>
          <SearchIcon size={24} />
        </button>
        <button onClick={() => setActiveView(activeView === 'analysis' ? null : 'analysis')} className={`text-textSecondary hover:text-textPrimary ${activeView === 'analysis' ? 'border-b-2 border-highlight' : ''}`}>
          <CheckSquare size={24} />
        </button>
        <button onClick={() => setActiveView(activeView === 'output' ? null : 'output')} className={`text-textSecondary hover:text-textPrimary ${activeView === 'output' ? 'border-b-2 border-highlight' : ''}`}>
          <SquareTerminal size={24} />
        </button>
      </div>
    </div>
  );
};

export default EditorPage;