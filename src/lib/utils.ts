import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
  KES: "sw-KE",
  GHS: "en-GH",
  ZAR: "en-ZA",
};

export function generateWhatsAppLink(
  phone: string,
  text?: string,
  countryCode?: string,
) {
  // 1. Remove non-numeric characters (spaces, dashes, pluses)
  let cleanNumber = phone.replace(/[^0-9]/g, "");

  if (!countryCode || countryCode === "NG") {
    // 2. Handle Nigerian format (080... -> 23480...)
    if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
      cleanNumber = "234" + cleanNumber.substring(1);
    }

    // 3. Handle numbers that don't have country code but aren't 080 (fallback)
    if (cleanNumber.length === 10) {
      cleanNumber = "234" + cleanNumber;
    }
  }

  // 4. Encode the pre-filled message
  const encodedText = text ? encodeURIComponent(text) : "";

  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

export function formatDate(dateString: string | null, timezone?: string) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timezone ?? "Africa/Lagos",
  });
}

export function formatCurrency(amount: number, currency?: string) {
  const cur = currency ?? "NGN";
  const locale = CURRENCY_LOCALE_MAP[cur] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format an amount in kobo (e.g. from Paystack/DB) as Naira */
export function formatKobo(kobo: number) {
  return formatCurrency(kobo / 100);
}
