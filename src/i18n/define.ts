/**
 * One area's strings in both languages. Thai is the source: English must have exactly the same keys
 * and value types, so a missing or extra key fails `pnpm typecheck`.
 */
export function defineDict<T extends object>(dict: { th: T; en: NoInfer<T> }): { th: T; en: T } {
  return dict;
}
