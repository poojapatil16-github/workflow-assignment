import type { z } from 'zod';
import { workflowDefinitionSchema } from '@/types/workflow-definition';

/** Inferred from Zod so it stays aligned with the backend definition contract. */
export type WorkflowGraphDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowGraphState = WorkflowGraphDefinition['states'][number];
export type WorkflowGraphTransition = WorkflowGraphDefinition['transitions'][number];

export function emptyWorkflowDefinition(): WorkflowGraphDefinition {
  return { states: [], transitions: [] };
}
