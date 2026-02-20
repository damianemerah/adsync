import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateWhatsAppLink(phone: string, text?: string) {
  // 1. Remove non-numeric characters (spaces, dashes, pluses)
  let cleanNumber = phone.replace(/[^0-9]/g, "");

  // 2. Handle Nigerian format (080... -> 23480...)
  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    cleanNumber = "234" + cleanNumber.substring(1);
  }

  // 3. Handle numbers that don't have country code but aren't 080 (fallback)
  if (cleanNumber.length === 10) {
    cleanNumber = "234" + cleanNumber;
  }

  // 4. Encode the pre-filled message
  const encodedText = text ? encodeURIComponent(text) : "";

  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

export function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount / 100); // Paystack uses kobo
}
