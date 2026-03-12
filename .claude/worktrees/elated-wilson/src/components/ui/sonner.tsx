"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      gap={8}
      toastOptions={{
        classNames: {
          toast: [
            "group toast font-sans",
            "group-[.toaster]:bg-card",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border group-[.toaster]:border-border",
            "group-[.toaster]:rounded-xl",
            // Soft Lift shadow — navy-tinted, no harsh black
            "group-[.toaster]:[box-shadow:0_4px_20px_-2px_rgba(3,0,24,0.08)]",
          ].join(" "),
          title: "group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description:
            "group-[.toast]:text-subtle-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-subtle-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:text-subtle-foreground group-[.toast]:hover:text-foreground",
          success:
            "group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/5",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5",
          warning:
            "group-[.toaster]:border-amber-400/30 group-[.toaster]:bg-amber-50",
          info: "group-[.toaster]:border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
