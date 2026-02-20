/**
 * CTA (Call-to-Action) Type Definitions
 * Shared types for platform-specific CTA handling
 */

export type CTAIntent =
  | "start_whatsapp_chat"
  | "buy_now"
  | "learn_more"
  | "book_appointment"
  | "get_quote"
  | "sign_up"
  | "download";

export type MetaCTACode =
  | "SEND_MESSAGE"
  | "GET_QUOTE"
  | "CONTACT_US"
  | "SHOP_NOW"
  | "LEARN_MORE"
  | "SIGN_UP"
  | "GET_OFFER"
  | "BOOK_NOW"
  | "DOWNLOAD";

export type TikTokCTACode =
  | "SHOP_NOW"
  | "LEARN_MORE"
  | "DOWNLOAD"
  | "BOOK_NOW"
  | "SIGN_UP"
  | "CONTACT_US";

export type PlatformCTACode = MetaCTACode | TikTokCTACode;

export interface CTAOption {
  code: PlatformCTACode;
  label: string;
  description?: string;
}

export interface CTAData {
  intent: CTAIntent;
  platformCode: PlatformCTACode;
  displayLabel: string;
  whatsappMessage?: string;
}
