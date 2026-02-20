export interface PromptVariable {
  key: string;
  label: string;
  defaultValue?: string;
}

export const PromptParser = {
  // Extract variables to show form inputs in UI
  extractVariables(template: string): PromptVariable[] {
    const regex = /\{argument\s+name="([^"]+)"(?:\s+default="([^"]+)")?\}/g;
    const variables: PromptVariable[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.push({
        key: match[1],
        label: match[1].charAt(0).toUpperCase() + match[1].slice(1),
        defaultValue: match[2],
      });
    }
    return variables;
  },

  // Replace variables with user input
  fill(template: string, values: Record<string, string>): string {
    return template.replace(
      /\{argument\s+name="([^"]+)"(?:\s+default="([^"]+)")?\}/g,
      (_, name, def) => {
        // Use user value, or default, or empty string
        return values[name] || def || "";
      },
    );
  },
};
