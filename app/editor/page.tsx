'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Play, Files, Search as SearchIcon, CheckSquare, Plus, Minus, SquareTerminal, Bug, Save } from 'lucide-react';
import FileExplorer from '../components/editor/FileExplorer';
import Search from '../components/editor/Search';
import Analysis from '../components/editor/Analysis';
import Terminal from '../components/editor/Terminal';
import Debug from '../components/editor/Debug';
import { useLanguageDetector } from '../components/editor/useLanguageDetector';

const MOCK_FILE_SYSTEM: { [key: string]: { entries: { name: string; type: string; }[] } } = {
  ".": {
    entries: [
      { name: ".next", type: "directory" },
      { name: ".vscode", type: "directory" },
      { name: "app", type: "directory" },
      { name: "public", type: "directory" },
      { name: "types", type: "directory" },
      { name: "README.md", type: "file" },
      { name: "package.json", type: "file" },
    ]
  },
  "app": {
    entries: [
      { name: "api", type: "directory" },
      { name: "components", type: "directory" },
      { name: "editor", type: "directory" },
      { name: "sentry-example-page", type: "directory" },
      { name: "admin", type: "directory" },
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
  "app/api/auth": {
    entries: [
        { name: "[...nextauth]", type: "directory" },
    ]
  },
  "app/admin": {
    entries: [
        { name: "dashboard", type: "directory" },
        { name: "login", type: "directory" },
        { name: "user-monitoring", type: "directory" },
    ]
  },
  "public": {
    entries: [
        { name: "fonts", type: "directory" },
        { name: "workers", type: "directory" },
    ]
  }
};

const MOCK_FILE_CONTENTS: { [key: string]: string } = {
  "README.md": "This is a mock README file content.\n\nThis content is loaded from MOCK_FILE_CONTENTS in app/editor/page.tsx.",
  "package.json": "{\n  \"name\": \"mock-project\",\n  \"version\": \"1.0.0\",\n  \"description\": \"A mock project for demonstration\",\n  \"main\": \"index.js\",\n  \"scripts\": {\n    \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"\n  },\n  \"author\": \"Gemini Agent\",\n  \"license\": \"MIT\"\n}",
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

const LANGUAGE_MAP: { [key: number]: string } = {
  71: 'python',
  54: 'cpp',
  50: 'c',
  62: 'java',
  63: 'javascript',
};

const EditorPage = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorations = useRef<string[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<monaco.editor.FindMatch[]>([]);
  const [currentExplorerPath, setCurrentExplorerPath] = useState<string>('.'); 
  const [explorerItems, setExplorerItems] = useState<any[]>([]); 
  const [expanded, setExpanded] = useState<string[]>([]); 
  const [fontSize, setFontSize] = useState(16);
  const [output, setOutput] = useState<string | null>(null);
  const [terminalKey, setTerminalKey] = useState(0);
  const [languageId, setLanguageId] = useState(71);
  const [stdin, setStdin] = useState("");
  const [analysis, setAnalysis] = useState<{ explanation: string; suggestions: string[]; model: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugAnalysis, setDebugAnalysis] = useState<{ explanation: string; suggestions: string[] } | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [activeFileName, setActiveFileName] = useState('untitled');
  const [code, setCode] = useState<string>('');

  useLanguageDetector(code, setLanguageId, languageId);

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

  useEffect(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current; 
    if (!editor || !monacoInstance) return; 

    decorations.current = editor.deltaDecorations(
      decorations.current,
      []
    );

    if (searchQuery) {
      const model = editor.getModel();
      if (!model) return; 

      const matches = model.findMatches(
        searchQuery,
        false, 
        false, 
        false, 
        null, 
        true  
      );
      setSearchResults(matches); 

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
      setSearchResults([]);
    }
  }, [searchQuery, editorRef.current, monacoRef.current]); 

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
            children: entry.type === 'directory' ? [] : undefined,
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

    if (node && node.isDir && isExpanded && node.children.length === 0) {
      try {
        const result = await mockListDirectory(node.id);
        if (result.list_directory_response && result.list_directory_response.entries) {
          const newChildren = result.list_directory_response.entries.map((entry: any) => {
            const fullPath = `${node.id}/${entry.name}`;
            return {
              id: fullPath,
              name: entry.name,
              isDir: entry.type === 'directory',
              children: entry.type === 'directory' ? [] : undefined,
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

    editor.updateOptions({ fontSize: fontSize });

    const model = editor.getModel();
    if (model) {
      const savedCode = localStorage.getItem('editor-content');
      if (savedCode) {
        model.setValue(savedCode);
      }

      const initialCode = model.getValue();
      setCode(initialCode);
      workerRef.current?.postMessage({ code: initialCode, version: model.getVersionId() });

      model.onDidChangeContent(() => {
        const currentCode = model.getValue();
        setCode(currentCode);
        localStorage.setItem('editor-content', currentCode);
        workerRef.current?.postMessage({ code: currentCode, version: model.getVersionId() });
      });
    }
  };

  const handleAnalyzeCode = async (output?: string) => {
    if (!editorRef.current) return;
    setIsAnalyzing(true);
    const codeToAnalyze = editorRef.current.getValue();

    try {
      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codeToAnalyze, output }),
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      setAnalysis({ explanation: 'Failed to analyze code.', suggestions: [], model: '' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDebugCode = async () => {
    if (!editorRef.current) return;
    setIsDebugging(true);
    const codeToAnalyze = editorRef.current.getValue();

    try {
      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codeToAnalyze, analysisType: 'debug' }),
      });
      const data = await response.json();
      setDebugAnalysis(data);
    } catch (error) {
      setDebugAnalysis({ explanation: 'Failed to debug code.', suggestions: [] });
    } finally {
      setIsDebugging(false);
    }
  };

  const handleRunCode = async () => {
    if (!editorRef.current) return;
    setTerminalKey(prevKey => prevKey + 1);
    const codeToRun = editorRef.current.getValue();
    setOutput("Running code...");
    setActiveView('output');

    try {
      const response = await fetch('/api/run-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codeToRun, language_id: languageId, stdin: stdin }),
      });
      const result = await response.json();

      let outputString = "";
      if (result.stdout) {
        outputString += `${result.stdout}`;
      } else if (result.stderr) {
        outputString += `${result.stderr}`;
      } else if (result.compile_output) {
        outputString += `${result.compile_output}`;
      } else {
        outputString = "No output.";
      }

      setOutput(outputString);
      setStdin("");
      await handleAnalyzeCode();
    } catch (error) {
      setOutput('Failed to run code.');
      await handleAnalyzeCode();
    }
  };

  const handleSaveProject = async () => {
    if (!editorRef.current) return;
    const codeToSave = editorRef.current.getValue();

    try {
      const response = await fetch('/api/save-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: activeFileName, fileData: codeToSave }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Project saved successfully:', data.message);
      } else {
        console.error('Failed to save project:', data.message);
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleIncreaseFontSize = () => {
    const newSize = fontSize + 2;
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const handleDecreaseFontSize = () => {
    const newSize = Math.max(8, fontSize - 2); 
    setFontSize(newSize);
    editorRef.current?.updateOptions({ fontSize: newSize });
  };

  const handleFileClick = async (filePath: string) => {
    try {
      const result = await mockReadFile(filePath);
      if (result.read_file_response && result.read_file_response.output) {
        const fileContent = result.read_file_response.output;
        editorRef.current?.setValue(fileContent);
        setCode(fileContent); // Also update the code state here
        setActiveFileName(filePath.split('/').pop() || 'untitled');
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
        {activeView === 'analysis' && <Analysis analysis={analysis} isAnalyzing={isAnalyzing} />}
        {activeView === 'debug' && <Debug analysis={debugAnalysis} isAnalyzing={isDebugging} onDebug={handleDebugCode} />}
        {activeView === 'output' && <Terminal key={terminalKey} output={output} stdin={stdin} setStdin={setStdin} />}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <div className={activeView ? "w-3/5 h-full" : "w-full h-full"}>
        <div className="h-[30px] bg-base flex items-center justify-between pr-4">
          <span className="text-textPrimary ml-4 font-semibold">{activeFileName}</span>
          <div className="flex items-center">
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
          <select 
            value={languageId}
            onChange={(e) => setLanguageId(parseInt(e.target.value))}
            className="bg-base text-textPrimary rounded p-1 ml-2"
          >
            <option value={71}>Python</option>
            <option value={54}>C++</option>
            <option value={50}>C</option>
            <option value={62}>Java</option>
            <option value={63}>JavaScript</option>
          </select>
          <button 
            onClick={handleRunCode}
            className="text-textSecondary hover:text-borderLine z-5 ml-2" 
          >
            <Play size={22} />
          </button>
          <button 
            onClick={handleSaveProject}
            className="text-textSecondary hover:text-borderLine z-5 ml-2" 
          >
            <Save size={22} />
          </button>
          </div>
        </div>
        <Editor
          height="100%" 
          width="100%"
          language={LANGUAGE_MAP[languageId] || 'python'}
          onMount={handleEditorDidMount}
          theme="vs-dark"
        />
      </div>
      <div className={activeView ? "w-2/5 p-4 h-full" : "w-0 h-full"}>
        {renderActiveView()}
      </div>
      <div className="bg-base mt-[30px] p-2 flex flex-col items-center space-y-4 flex-grow h-full">
        <button title="File Explorer" onClick={() => setActiveView(activeView === 'explorer' ? null : 'explorer')} className={`text-textSecondary hover:text-textPrimary pb-1 ${activeView === 'explorer' ? 'border-b-2 border-highlight' : ''}`}>
          <Files size={24} />
        </button>
        <button title="Search" onClick={() => setActiveView(activeView === 'search' ? null : 'search')} className={`text-textSecondary hover:text-textPrimary pb-1 ${activeView === 'search' ? 'border-b-2 border-highlight' : ''}`}>
          <SearchIcon size={24} />
        </button>
        <button title="Analysis" onClick={() => setActiveView(activeView === 'analysis' ? null : 'analysis')} className={`text-textSecondary hover:text-textPrimary pb-1 ${activeView === 'analysis' ? 'border-b-2 border-highlight' : ''}`}>
          <CheckSquare size={24} />
        </button>
        <button title="Debug" onClick={() => setActiveView(activeView === 'debug' ? null : 'debug')} className={`text-textSecondary hover:text-textPrimary pb-1 ${activeView === 'debug' ? 'border-b-2 border-highlight' : ''}`}>
          <Bug size={24} />
        </button>
        <button title="Terminal" onClick={() => setActiveView(activeView === 'output' ? null : 'output')} className={`text-textSecondary hover:text-textPrimary pb-1 ${activeView === 'output' ? 'border-b-2 border-highlight' : ''}`}>
          <SquareTerminal size={24} />
        </button>
      </div>
    </div>
  );
};

export default EditorPage;