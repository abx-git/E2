import type { de } from "@/i18n/messages/de";

/** Nested catalogs with string leaves (values may differ per locale). */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

/** Shape of every locale catalog (German is the source of truth for keys). */
export type MessageTree = DeepStringify<typeof de>;

type Join<K extends string, P extends string> = `${K}.${P}`;

/**
 * Dot-paths to string leaves, e.g. `"common.cancel"` | `"app.description"`.
 * Derived from the German catalog’s structure.
 */
export type MessageKey<T = typeof de> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? Join<K, MessageKey<T[K]>>
          : never;
    }[keyof T & string];

/** Values for `{name}` placeholders in messages. */
export type MessageVars = Record<string, string | number | boolean | null | undefined>;
