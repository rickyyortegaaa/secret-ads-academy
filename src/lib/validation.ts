import { z } from "zod";

export const studentLoginSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "El nombre es demasiado largo"),
  lastName: z
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(80, "El apellido es demasiado largo"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email no válido")
    .max(120, "Email demasiado largo"),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
