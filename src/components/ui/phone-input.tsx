import * as React from "react";
import PhoneInputComponent, { type Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: Value | string;
  onChange?: (value?: Value | string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    return (
      <PhoneInputComponent
        international
        defaultCountry="NG"
        value={value as Value}
        onChange={(val) => onChange?.(val ? String(val) : "")}
        numberInputProps={{
          className:
            "flex-1 h-full bg-transparent px-3.5 py-2.5 text-base md:text-sm placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          ...props,
          ref,
        }}
        className={cn(
          "flex w-full items-center rounded-md border border-border bg-transparent shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30",
          "focus-within:border-none focus-within:ring-[3px] focus-within:ring-ring/50",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:self-stretch [&_.PhoneInputCountry]:px-3 [&_.PhoneInputCountry]:border-r [&_.PhoneInputCountry]:border-border [&_.PhoneInputCountry]:mr-0",
          "[&_.PhoneInputCountrySelectArrow]:ml-2 [&_.PhoneInputCountrySelectArrow]:opacity-50",
          className
        )}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";
