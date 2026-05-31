// Shared FormData parsing helpers for server actions. Kept in one place so the
// trim/empty-string/integer conventions stay identical across every action.

/** Trimmed string for a field, or "" if missing. */
export function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

/** Trimmed string, or null when the field is empty/missing. */
export function nullableStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

/** Optional integer field; throws on non-numeric input so the admin form
 *  surfaces the error instead of inserting NaN. */
export function nullableInt(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`${key} must be a whole number.`);
  return n;
}
