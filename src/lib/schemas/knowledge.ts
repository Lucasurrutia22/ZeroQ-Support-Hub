import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export const documentFileTypeSchema = z.enum([
  "manual",
  "datasheet",
  "firmware_notes",
  "otro",
]);

export const createProcedureSchema = z.object({
  title: z.string().trim().min(3).max(200),
  categoryId: z.string().min(1),
  riskLevel: riskLevelSchema,
  estimatedTimeMinutes: z.coerce.number().int().positive().optional(),
  contentMarkdown: z.string().trim().min(1),
  tagNames: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    ),
});

export const addProcedureVersionSchema = z.object({
  contentMarkdown: z.string().trim().min(1),
  changeSummary: z.string().trim().max(500).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parentId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
});

export const uploadDocumentMetadataSchema = z.object({
  title: z.string().trim().min(3).max(200),
  categoryId: z.string().min(1),
  fileType: documentFileTypeSchema,
});
