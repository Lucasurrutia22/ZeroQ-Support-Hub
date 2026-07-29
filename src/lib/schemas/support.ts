import { z } from "zod";

export const clientTypeSchema = z.enum([
  "banco",
  "hospital",
  "municipalidad",
  "retail",
  "gobierno",
  "otro",
]);

export const assetTypeSchema = z.enum([
  "totem",
  "modulo_atencion",
  "pantalla",
  "impresora",
  "servidor",
  "tv_box",
  "otro",
]);

export const attachmentFileTypeSchema = z.enum([
  "image",
  "video",
  "pdf",
  "config",
  "log",
]);

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(200),
  type: clientTypeSchema,
});

export const registerAssetSchema = z.object({
  clientId: z.string().min(1),
  type: assetTypeSchema,
  model: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  serialNumber: z.string().trim().max(200).optional(),
});

export const createResolvedCaseSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1),
  categoryId: z.string().min(1),
  clientId: z.string().optional(),
  infrastructureAssetId: z.string().optional(),
  symptoms: z.string().trim().min(1),
  rootCause: z.string().trim().min(1),
  solution: z.string().trim().min(1),
  timeSpentMinutes: z.coerce.number().int().positive().optional(),
  relatedProcedureIds: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [],
    ),
});

export const uploadAttachmentMetadataSchema = z.object({
  fileType: attachmentFileTypeSchema,
});
