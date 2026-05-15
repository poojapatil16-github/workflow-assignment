import { useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';

import { stringifyDefinition, validateWorkflowDefinition } from '@/lib/workflowDefinitionValidation';
import { useWorkflowBuilderStore } from '@/store/workflowBuilderStore';
import { workflowLiveJsonText } from './workflowLiveJson';

const DEBOUNCE_MS = 380;

export function WorkflowJsonEditorPanel() {
  const definition = useWorkflowBuilderStore((s) => s.definition);
  const visualRevision = useWorkflowBuilderStore((s) => s.visualRevision);
  const lastSource = useWorkflowBuilderStore((s) => s.lastSource);
  const applyDefinitionFromJson = useWorkflowBuilderStore((s) => s.applyDefinitionFromJson);
  const setJsonError = useWorkflowBuilderStore((s) => s.setJsonError);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastSource === 'json') return;
    const ed = editorRef.current;
    if (!ed) return;
    const next = stringifyDefinition(definition);
    if (ed.getValue() !== next) {
      ed.setValue(next);
      workflowLiveJsonText.current = next;
    }
  }, [definition, visualRevision, lastSource]);

  const runValidation = useCallback(
    (text: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setJsonError('Invalid JSON — check brackets and quotes.');
        return;
      }
      const res = validateWorkflowDefinition(parsed);
      if (!res.ok) {
        setJsonError(res.errors.join(' · '));
        return;
      }
      setJsonError(null);
      applyDefinitionFromJson(res.definition);
      const ed = editorRef.current;
      if (ed) {
        const formatted = stringifyDefinition(res.definition);
        if (formatted !== ed.getValue()) {
          ed.setValue(formatted);
        }
        workflowLiveJsonText.current = formatted;
      }
    },
    [applyDefinitionFromJson, setJsonError],
  );

  const onChange = useCallback(
    (value: string | undefined) => {
      workflowLiveJsonText.current = value ?? '';
      const text = value ?? '';
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runValidation(text), DEBOUNCE_MS);
    },
    [runValidation],
  );

  const onMount = useCallback(
    (ed: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = ed;
      const seed = stringifyDefinition(useWorkflowBuilderStore.getState().definition);
      workflowLiveJsonText.current = seed;
      ed.setValue(seed);
      ed.updateOptions({
        minimap: { enabled: false },
        fontSize: 12,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      });
    },
    [],
  );

  return (
    <div className="flex min-h-[320px] flex-1 flex-col rounded-md border border-border-secondary bg-bg-secondary">
      <div className="border-b border-border-tertiary px-3 py-2 text-xs font-medium text-fg-secondary">
        Definition JSON (live sync)
      </div>
      <div className="h-[440px] min-h-[280px] w-full lg:h-[520px]">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs"
          onChange={onChange}
          onMount={onMount}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}
