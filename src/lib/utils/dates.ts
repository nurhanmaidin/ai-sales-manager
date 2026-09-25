/** Formats a Date as the value for `<input type="datetime-local">` (local time). */
export function toDateTimeLocal(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Formats a Date as the value for `<input type="date">` (local time). */
export function toDateInput(date: Date | string | null | undefined) {
  return toDateTimeLocal(date).slice(0, 10);
}
