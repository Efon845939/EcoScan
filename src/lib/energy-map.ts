export function toEnergyEnum(raw: string): "none"|"low"|"medium"|"high" {
  const s = (raw||"").toLowerCase();
  if (/^(none|off|kapalı|kapali|hiç|hic)$/.test(s)) return "none";
  if (/high|hepsi.*aç|tum.*ac|klima.*ac/.test(s)) return "high";
  if (/medium|orta/.test(s)) return "medium";
  if (/low|biraz|az/.test(s)) return "low";
  return "low";
}

    