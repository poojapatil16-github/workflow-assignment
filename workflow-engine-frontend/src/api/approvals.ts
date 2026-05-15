import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

const pendingApprovalRow = z.record(z.string(), z.unknown());

export async function listPendingApprovals() {
  const res = await apiClient.get(PATHS.approvalsPending);
  return parseSuccessData(z.array(pendingApprovalRow), res.data);
}

export const approvalDecisionBodySchema = z.object({
  comment: z.string().max(2000).optional(),
});
export type ApprovalDecisionBody = z.infer<typeof approvalDecisionBodySchema>;

export async function approveApproval(id: string, body: ApprovalDecisionBody = {}) {
  const res = await apiClient.post(PATHS.approvalApprove(id), approvalDecisionBodySchema.parse(body));
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}

export async function rejectApproval(id: string, body: ApprovalDecisionBody = {}) {
  const res = await apiClient.post(PATHS.approvalReject(id), approvalDecisionBodySchema.parse(body));
  return parseSuccessData(z.record(z.string(), z.unknown()), res.data);
}
