/** Reading backoffice forms. All dates and times organisers type are Bangkok time. */

/** Trimmed text, or null when the field is empty or missing. */
export function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** A number, null when empty, NaN when the field holds something that is not a number (the API then rejects it). */
export function num(fd: FormData, name: string): number | null {
  const t = text(fd, name);
  if (t === null) return null;
  return Number(t.replaceAll(",", ""));
}

/** "1,200.50" baht → 120050 satang. */
export function satang(fd: FormData, name: string): number | null {
  const n = num(fd, name);
  return n === null ? null : Math.round(n * 100);
}

/** A <input type="datetime-local"> value ("2026-11-01T10:00") read as Bangkok time → ISO with offset. */
export function bangkokToIso(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/);
  return m ? `${m[1]}T${m[2]}${m[3] ?? ":00"}+07:00` : value;
}

/** ISO timestamp → value for <input type="datetime-local"> in Bangkok time. */
export function isoToBangkokInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

/** Satang → value for a baht input ("1200" or "1200.5"). */
export function satangToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value / 100);
}

/** Keeps only the keys whose value is not undefined, so PATCH bodies only carry what the form had. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
