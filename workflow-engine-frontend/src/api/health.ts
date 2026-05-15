import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

const healthDataSchema = z.object({
  status: z.string(),
  database: z.string().optional(),
});

export async function fetchHealth() {
  const res = await apiClient.get(PATHS.health);
  return parseSuccessData(healthDataSchema, res.data);
}
