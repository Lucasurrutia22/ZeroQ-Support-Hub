import { z } from "zod";

export const roleSchema = z.enum([
  "admin",
  "supervisor",
  "engineer_l1",
  "engineer_l2",
  "readonly",
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
  role: roleSchema,
});
