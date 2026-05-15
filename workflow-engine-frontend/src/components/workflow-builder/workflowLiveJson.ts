import { validateWorkflowDefinition } from '@/lib/workflowDefinitionValidation';
import { useWorkflowBuilderStore } from '@/store/workflowBuilderStore';

/** Mirrors the Monaco buffer so form submit commits in-flight edits. */
export const workflowLiveJsonText = { current: '' };

/** Parse draft text and merge into builder store before submit. Returns errors if JSON or schema fails. */
export function syncWorkflowLiveJsonIntoStore(): { ok: true } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(workflowLiveJsonText.current || '{}') as unknown;
  } catch {
    return { ok: false, message: 'Definition JSON has syntax errors. Fix the editor before creating the workflow.' };
  }

  const res = validateWorkflowDefinition(parsed);
  if (!res.ok) {
    useWorkflowBuilderStore.getState().setJsonError(res.errors.join(' · '));
    return { ok: false, message: res.errors.join(' · ') };
  }

  useWorkflowBuilderStore.getState().setJsonError(null);
  useWorkflowBuilderStore.getState().applyDefinitionFromJson(res.definition);
  return { ok: true };
}
