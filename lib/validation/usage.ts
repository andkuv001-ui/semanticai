import { z } from "zod";

export const updateUsageSchema = z.object({
  generationCount: z.number().int().min(0),
  tokenCount: z.number().int().min(0),
  limit: z.number().int().min(1),
});

export type UpdateUsageInput = z.infer<typeof updateUsageSchema>;
