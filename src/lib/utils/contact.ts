/** Builds a wa.me link, normalising Malaysian local numbers (012… → 6012…). */
export function whatsappLink(phone: string | null | undefined, text?: string) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `6${digits}`;
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string | null | undefined) {
  if (!phone) return null;
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
