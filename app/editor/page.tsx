'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

const EditorPage = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

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

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

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

  return (
    <div>
      <h1>Monaco Editor with ESLint</h1>
      <Editor
        height="90vh"
        // width="70%"
        defaultLanguage="javascript"
        onMount={handleEditorDidMount}
        theme="vs-dark"
      />
    </div>
  );
};

export default EditorPage;
