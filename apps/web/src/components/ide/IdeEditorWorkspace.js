/**
 * CircuitSage AI — IDE Monaco Editor Workspace
 *
 * Renders:
 * - File tab strip with dirty indicator and close buttons
 * - Monaco Editor with C++ (Arduino) syntax highlighting and dark theme
 * - Line numbers, cursor position tracking, and keyboard shortcut handlers
 * - Fallback / empty states when no files are open
 */

'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to prevent SSR window/document reference errors
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-mono text-xs space-y-2">
      <span className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin"></span>
      <span>Loading Monaco Editor...</span>
    </div>
  )
});

export default function IdeEditorWorkspace({
  openTabs = [],
  activeFile,
  onSelectTab,
  onCloseTab,
  fileContent = '',
  onChangeContent,
  onSave,
  onBuild,
  onCursorChange,
  problems = []
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Determine Monaco language based on file extension
  function getLanguage(fileName) {
    if (!fileName) return 'plaintext';
    if (fileName.endsWith('.ino') || fileName.endsWith('.cpp') || fileName.endsWith('.h') || fileName.endsWith('.c')) {
      return 'cpp';
    }
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.md')) return 'markdown';
    return 'plaintext';
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor movements for status bar reporting
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    // Keyboard Shortcuts: Ctrl+S to save, Ctrl+B to compile
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      if (onBuild) onBuild();
    });
  }

  // Update Monaco diagnostic markers whenever compiler problems change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeFile) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    // Filter problems relevant to active open file
    const fileProblems = problems.filter(
      (p) => p.file.endsWith(activeFile) || p.file.includes(activeFile)
    );

    const markers = fileProblems.map((prob) => ({
      startLineNumber: prob.line || 1,
      startColumn: prob.column || 1,
      endLineNumber: prob.line || 1,
      endColumn: (prob.column || 1) + 10,
      message: prob.message,
      severity:
        prob.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : prob.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info
    }));

    monaco.editor.setModelMarkers(model, 'circuitsage-compiler', markers);
  }, [problems, activeFile]);

  return (
    <section
      className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden"
      aria-label="Code Editor Workspace"
    >
      {/* Editor Tab Strip */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center overflow-x-auto select-none px-1 flex-shrink-0">
        {openTabs.length === 0 ? (
          <span className="text-slate-500 font-mono text-[11px] px-3">No active sketch open</span>
        ) : (
          openTabs.map((tab) => {
            const isActive = tab.name === activeFile;
            return (
              <div
                key={tab.name}
                onClick={() => onSelectTab(tab.name)}
                className={`group flex items-center gap-2 px-3 py-1.5 border-r border-slate-800 cursor-pointer font-mono text-xs transition-colors h-full ${
                  isActive
                    ? 'bg-slate-950 text-slate-100 border-t-2 border-t-blue-500 font-medium'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <span>
                  {tab.name.endsWith('.ino') ? '⚡' : tab.name.endsWith('.h') ? '📦' : '📄'}
                </span>
                <span>{tab.name}</span>
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Unsaved changes"></span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-200 text-xs rounded ml-1"
                  title="Close tab"
                  aria-label={`Close ${tab.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        {activeFile ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(activeFile)}
            theme="vs-dark"
            value={fileContent}
            onChange={(val) => onChangeContent(val || '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              foldingHighlight: true,
              foldingStrategy: 'auto',
              showFoldingControls: 'always',
              find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'never',
                seedSearchStringFromSelection: 'always'
              },
              renderWhitespace: 'selection',
              renderLineHighlight: 'all',
              smoothScrolling: true,
              cursorBlinking: 'smooth'
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500 font-mono text-xs">
            <span className="text-4xl text-slate-700">⚡</span>
            <div className="space-y-1">
              <h3 className="text-slate-300 font-semibold text-sm">No Sketch File Open</h3>
              <p>Select a file from the explorer on the left or create a new file.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 max-w-sm">
              Keyboard Shortcuts: <br />
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Ctrl+B</kbd> Verify / Build Project <br />
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">Ctrl+S</kbd> Save File
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
