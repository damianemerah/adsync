"use client";

import { useMemo, useState } from "react";
import { Sparks, SystemRestart } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PromptParser } from "@/lib/ai/prompt-parser";
import {
  type CreativeTemplate,
  type TemplateVariableDef,
} from "@/hooks/use-creative-templates";

export interface TemplateVariableFormProps {
  template: CreativeTemplate;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel?: () => void;
}

/**
 * Resolves the form schema. Prefers the curated `variables` JSONB metadata; falls
 * back to PromptParser regex extraction so newly-seeded templates still render
 * a usable form before metadata is hand-tuned.
 */
function resolveSchema(template: CreativeTemplate): TemplateVariableDef[] {
  const raw = Array.isArray(template.variables) ? (template.variables as unknown[]) : [];
  const curated = raw
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      key: String(v.key ?? ""),
      label: typeof v.label === "string" ? v.label : undefined,
      type: (v.type === "select" || v.type === "color" ? v.type : "text") as
        | "text"
        | "select"
        | "color",
      placeholder: typeof v.placeholder === "string" ? v.placeholder : undefined,
      options: Array.isArray(v.options) ? v.options.filter((o) => typeof o === "string") as string[] : undefined,
      default: typeof v.default === "string" ? v.default : undefined,
      required: v.required === true,
    }))
    .filter((v) => v.key);

  if (curated.length > 0) return curated;

  return PromptParser.extractVariables(template.prompt_template).map((v) => ({
    key: v.key,
    label: v.label,
    type: "text" as const,
    default: v.defaultValue,
  }));
}

function humanLabel(key: string) {
  return key
    .split(/[_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function TemplateVariableForm({
  template,
  isSubmitting,
  submitLabel = "Generate",
  onSubmit,
  onCancel,
}: TemplateVariableFormProps) {
  const schema = useMemo(() => resolveSchema(template), [template]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const v of schema) {
      if (v.default) init[v.key] = v.default;
    }
    return init;
  });

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const missingRequired = schema.some((v) => v.required && !values[v.key]?.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (missingRequired || isSubmitting) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-heading text-lg text-foreground">{template.title}</h3>
        {template.description && (
          <p className="text-sm text-subtle-foreground mt-1">{template.description}</p>
        )}
      </div>

      {schema.length === 0 ? (
        <p className="text-sm text-subtle-foreground bg-muted/40 rounded-md p-3">
          This template has no variables — it&apos;s ready to generate.
        </p>
      ) : (
        <div className="space-y-3">
          {schema.map((v) => {
            const label = v.label || humanLabel(v.key);
            const value = values[v.key] ?? "";

            if (v.type === "select" && v.options && v.options.length > 0) {
              return (
                <div key={v.key} className="space-y-1.5">
                  <Label htmlFor={`tpl-${v.key}`} className="text-xs font-semibold">
                    {label}
                    {v.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <Select
                    value={value || undefined}
                    onValueChange={(val) => setValue(v.key, val)}
                  >
                    <SelectTrigger id={`tpl-${v.key}`}>
                      <SelectValue placeholder={v.placeholder ?? `Choose ${label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {v.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (v.type === "color") {
              return (
                <div key={v.key} className="space-y-1.5">
                  <Label htmlFor={`tpl-${v.key}`} className="text-xs font-semibold">
                    {label}
                    {v.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`tpl-${v.key}`}
                      type="color"
                      value={value || "#000000"}
                      onChange={(e) => setValue(v.key, e.target.value)}
                      className="h-9 w-14 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={value}
                      placeholder={v.placeholder ?? "#FFFFFF"}
                      onChange={(e) => setValue(v.key, e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={v.key} className="space-y-1.5">
                <Label htmlFor={`tpl-${v.key}`} className="text-xs font-semibold">
                  {label}
                  {v.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <Input
                  id={`tpl-${v.key}`}
                  type="text"
                  value={value}
                  placeholder={v.placeholder}
                  onChange={(e) => setValue(v.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={missingRequired || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <SystemRestart className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparks className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
