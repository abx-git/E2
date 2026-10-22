/** Short aliases (e0, s1, …) ↔ stable board ids for compact export. */
export class AliasMap {
  private readonly prefix: string;
  private readonly forward = new Map<string, string>();
  private readonly reverse = new Map<string, string>();
  private counter = 0;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  alias(realId: string): string {
    const id = realId.trim();
    const existing = this.forward.get(id);
    if (existing) return existing;
    const next = `${this.prefix}${this.counter++}`;
    this.forward.set(id, next);
    this.reverse.set(next, id);
    return next;
  }

  resolve(aliasOrId: string): string {
    return this.reverse.get(aliasOrId) ?? aliasOrId;
  }

  entries(): Array<[alias: string, realId: string]> {
    return [...this.reverse.entries()].map(([a, r]) => [a, r]);
  }

  static mergeIdMaps(maps: AliasMap[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const m of maps) {
      for (const [alias, real] of m.entries()) out.set(alias, real);
    }
    return out;
  }
}
