import { z } from "zod";

export const createFavoriteSchema = z.object({
  keyword: z.string().min(1).max(200),
  sourceGenerationId: z.string().min(1).max(200).optional(),
});

export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
