export function toEnergyEnum(raw: string): "none"|"low"|"medium"|"high" {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "low";
  if (/(hepsi|tüm|bütün|all).*aç(ı|i)k|on/.test(s)) return "high";
  if (/(klima|ac|air conditioner).*(aç(ı|i)k|on)/.test(s)) return "high";
  if (/(biraz|az|a little|a few).*aç(ı|i)k|on/.test(s)) return "low";
  if (/(orta|medium)/.test(s)) return "medium";
  if (/(kapal(ı|i)|hiç|off|none)/.test(s)) return "none";
  return "low";
}
