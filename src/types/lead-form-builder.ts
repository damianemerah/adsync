export type MetaStandardFieldType =
  | "FULL_NAME"
  | "FIRST_NAME"
  | "LAST_NAME"
  | "EMAIL"
  | "WORK_EMAIL"
  | "PHONE_NUMBER"
  | "WORK_PHONE_NUMBER"
  | "STREET_ADDRESS"
  | "CITY"
  | "STATE"
  | "COUNTRY"
  | "POST_CODE"
  | "DATE_OF_BIRTH"
  | "GENDER"
  | "COMPANY_NAME"
  | "JOB_TITLE";

export type FormFieldType = MetaStandardFieldType | "CUSTOM" | "USER_CHOICE";

export interface FormField {
  id: string; // nanoid() — dnd-kit key
  type: FormFieldType;
  label?: string; // user label for CUSTOM / USER_CHOICE
  choices?: string[]; // options array for USER_CHOICE only
}

export const STANDARD_FIELD_LABELS: Record<MetaStandardFieldType, string> = {
  FULL_NAME: "Full Name",
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
  EMAIL: "Email",
  WORK_EMAIL: "Work Email",
  PHONE_NUMBER: "Phone Number",
  WORK_PHONE_NUMBER: "Work Phone",
  STREET_ADDRESS: "Street Address",
  CITY: "City",
  STATE: "State",
  COUNTRY: "Country",
  POST_CODE: "Post Code",
  DATE_OF_BIRTH: "Date of Birth",
  GENDER: "Gender",
  COMPANY_NAME: "Company Name",
  JOB_TITLE: "Job Title",
};

export const META_STANDARD_FIELDS: MetaStandardFieldType[] = [
  "FULL_NAME",
  "EMAIL",
  "PHONE_NUMBER",
  "COMPANY_NAME",
  "JOB_TITLE",
  "CITY",
  "STATE",
  "COUNTRY",
  "DATE_OF_BIRTH",
  "GENDER",
];

/** Fields that Meta pre-fills from the user's Facebook profile — shown with a badge in the builder. */
export const META_PREFILLED_FIELDS = new Set<MetaStandardFieldType>([
  "FULL_NAME",
  "FIRST_NAME",
  "LAST_NAME",
  "EMAIL",
  "WORK_EMAIL",
  "PHONE_NUMBER",
  "WORK_PHONE_NUMBER",
]);
