import { z } from "zod";
import { PLAN_IDS, ROLES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name must be less than 50 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

export const createOrgSchema = z.object({
  orgName: z.string().min(2),
  industry: z.string().min(1),
  // Enforces that plan MUST be one of 'starter', 'growth', 'agency'
  plan: z.nativeEnum(PLAN_IDS).default(PLAN_IDS.GROWTH),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([ROLES.EDITOR, ROLES.VIEWER]), // Owners can't be invited via simple form usually
});

// Types for TypeScript inference
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
