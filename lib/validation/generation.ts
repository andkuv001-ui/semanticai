import { z } from "zod";

export const createGenerationSchema = z.object({
  topic: z.string().min(1).max(300),
  keywords: z.array(z.string().min(1).max(200)).min(1).max(200),
  queries: z.array(z.string().min(1).max(300)).min(1).max(200),
  frequencies: z
    .record(z.string(), z.number().finite().nonnegative())
    .optional(),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
