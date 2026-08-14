import type { MessageKey, MessageTree, MessageVars } from "@/i18n/types";

export function getMessageByPath(tree: MessageTree, key: MessageKey): string | undefined {
  const parts = key.split(".");
  let cur: unknown = tree;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Replace `{name}` placeholders. Unknown placeholders are left intact. */
export function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) return match;
    const value = vars[name];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}
