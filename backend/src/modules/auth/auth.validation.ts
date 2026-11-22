/**
 * Request schemas for the auth endpoints.
 * Applied at the route boundary with validateBody() (see routes.ts).
 *
 * validateBody() replaces req.body with the parsed value, and Zod objects drop
 * unknown keys, so anything not listed here (for example `role`) never reaches
 * the controller or service.
 */

import { z } from "zod";

/**
 * Login only checks that credentials are present. It deliberately does not
 * enforce email format or password complexity, so existing accounts are never
 * locked out by a stricter rule than the one they were created under.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(254),
  password: z.string().min(1, "Password is required").max(1024),
});

/**
 * Self-service profile update. Only the display name is editable here; roles
 * are changed through an admin-only flow.
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(120).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
