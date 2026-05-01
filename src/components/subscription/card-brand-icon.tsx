"use client";

import { CreditCard } from "lucide-react";

interface CardBrandIconProps {
  cardType: string | null | undefined;
}

export function CardBrandIcon({ cardType }: CardBrandIconProps) {
  const brand = cardType?.toLowerCase() ?? "";
  const isMastercard = brand.includes("mastercard");
  const isVisa = brand.includes("visa");

  if (isMastercard) {
    return (
      <div className="flex items-center justify-center w-8 h-5 bg-white rounded-[2px] relative overflow-hidden shrink-0 border border-border">
        <div className="w-3 h-3 rounded-full bg-[#eb001b] absolute left-1 mix-blend-multiply opacity-90" />
        <div className="w-3 h-3 rounded-full bg-[#f79e1b] absolute right-1 mix-blend-multiply opacity-90" />
      </div>
    );
  }

  if (isVisa) {
    return <span className="text-xs font-black italic text-blue-600 tracking-tight">VISA</span>;
  }

  return <CreditCard className="w-4 h-4 text-subtle-foreground" />;
}

interface CardBrandLogoProps {
  cardType: string | null | undefined;
}

export function CardBrandLogo({ cardType }: CardBrandLogoProps) {
  const brand = cardType?.toLowerCase() ?? "";
  const isMastercard = brand.includes("mastercard");
  const isVisa = brand.includes("visa");

  return (
    <div className="w-12 h-8 bg-muted rounded flex items-center justify-center border border-border shadow-sm shrink-0">
      <div className="flex items-center justify-center w-full h-full bg-white rounded-[2px] relative overflow-hidden">
        {isMastercard && (
          <>
            <div className="w-4 h-4 rounded-full bg-[#eb001b] absolute left-2 opacity-90 mix-blend-multiply" />
            <div className="w-4 h-4 rounded-full bg-[#f79e1b] absolute right-2 opacity-90 mix-blend-multiply" />
          </>
        )}
        {isVisa && <span className="text-xs font-black italic text-blue-600 tracking-tight">VISA</span>}
        {!isMastercard && !isVisa && <CreditCard className="w-4 h-4 text-subtle-foreground" />}
      </div>
    </div>
  );
}
