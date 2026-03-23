import type { FormField } from "@/types/lead-form-builder";
import { nanoid } from "nanoid";

interface LeadFormDefaults {
  fields: FormField[];
  thankYouMessage: string;
}

// Best Practice: Group all contact info fields (FULL_NAME, EMAIL, PHONE) at the top
// so Meta can prefill them from the user's profile, creating a seamless experience.
const INDUSTRY_FIELD_MAP: Record<string, LeadFormDefaults> = {
  "E-commerce (Fashion/Beauty)": {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "EMAIL" },
      { id: nanoid(), type: "PHONE" },
      {
        id: nanoid(),
        type: "USER_CHOICE",
        label: "What product are you interested in?",
        choices: ["Clothing", "Shoes", "Bags", "Accessories"],
      },
    ],
    thankYouMessage: "Thanks! We'll reach out shortly with our latest collection.",
  },
  "Beauty & Cosmetics": {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "EMAIL" },
      { id: nanoid(), type: "PHONE" },
      {
        id: nanoid(),
        type: "USER_CHOICE",
        label: "What are you looking for?",
        choices: ["Skincare", "Hair care", "Makeup", "Nail care"],
      },
    ],
    thankYouMessage: "Thanks! We'll be in touch with product recommendations.",
  },
  "Food & Beverage": {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "PHONE" },
      { id: nanoid(), type: "EMAIL" },
      {
        id: nanoid(),
        type: "USER_CHOICE",
        label: "Preferred delivery time?",
        choices: ["Morning", "Afternoon", "Evening"],
      },
    ],
    thankYouMessage: "Thanks! We'll confirm your order shortly.",
  },
  Electronics: {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "EMAIL" },
      { id: nanoid(), type: "PHONE" },
      {
        id: nanoid(),
        type: "USER_CHOICE",
        label: "What's your budget range?",
        choices: ["Under ₦50,000", "₦50,000 - ₦150,000", "₦150,000 - ₦500,000", "Above ₦500,000"],
      },
    ],
    thankYouMessage: "Thanks! We'll send you the best options in your range.",
  },
  Events: {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "EMAIL" },
      { id: nanoid(), type: "PHONE" },
      {
        id: nanoid(),
        type: "USER_CHOICE",
        label: "What type of event?",
        choices: ["Wedding", "Birthday", "Corporate", "Other"],
      },
    ],
    thankYouMessage: "Thanks! We'll reach out to discuss your event.",
  },
  "B2B / Services": {
    fields: [
      { id: nanoid(), type: "FULL_NAME" },
      { id: nanoid(), type: "WORK_EMAIL" },
      { id: nanoid(), type: "PHONE" },
      { id: nanoid(), type: "COMPANY_NAME" },
      { id: nanoid(), type: "JOB_TITLE" },
    ],
    thankYouMessage: "Thanks! Our team will reach out within 24 hours.",
  },
};

const DEFAULT_FORM: LeadFormDefaults = {
  fields: [
    { id: nanoid(), type: "FULL_NAME" },
    { id: nanoid(), type: "EMAIL" },
    { id: nanoid(), type: "PHONE" },
    {
      id: nanoid(),
      type: "CUSTOM",
      label: "How can we help you?",
    },
  ],
  thankYouMessage: "Thanks for your interest! We'll be in touch soon.",
};

/**
 * Returns recommended lead form fields based on organization industry.
 * Instant, no AI call needed. Regenerates nanoid() keys each call for fresh dnd-kit IDs.
 */
export function getLeadFormDefaults(industry: string | null | undefined): LeadFormDefaults {
  if (!industry) return regenerateIds(DEFAULT_FORM);
  return regenerateIds(INDUSTRY_FIELD_MAP[industry] ?? DEFAULT_FORM);
}

/**
 * Maps AI suggestedLeadForm fields to FormField[] with fresh nanoid() keys.
 */
export function aiSuggestionToFormFields(
  suggestion: { fields: Array<{ type: string; label?: string; choices?: string[] }>; thankYouMessage: string },
): LeadFormDefaults {
  return {
    fields: suggestion.fields.map((f) => ({
      id: nanoid(),
      type: f.type as FormField["type"],
      ...(f.label ? { label: f.label } : {}),
      ...(f.choices ? { choices: f.choices } : {}),
    })),
    thankYouMessage: suggestion.thankYouMessage,
  };
}

function regenerateIds(defaults: LeadFormDefaults): LeadFormDefaults {
  return {
    ...defaults,
    fields: defaults.fields.map((f) => ({ ...f, id: nanoid() })),
  };
}
