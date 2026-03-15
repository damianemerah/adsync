export type MetaStandardFieldType =
  | "FULL_NAME"
  | "FIRST_NAME"
  | "LAST_NAME"
  | "EMAIL"
  | "WORK_EMAIL"
  | "PHONE"
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
  PHONE: "Phone Number",
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
  "PHONE",
  "COMPANY_NAME",
  "JOB_TITLE",
  "CITY",
  "STATE",
  "COUNTRY",
  "DATE_OF_BIRTH",
  "GENDER",
];
