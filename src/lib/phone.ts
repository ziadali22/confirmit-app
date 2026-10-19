// Normalize phone numbers to E.164-ish so "010..." and "+2010..." don't split
// into two customers. Default country is Egypt (+20). Meta sends digits with no
// "+", so normalization also makes inbound matching work.

export function normalizePhone(raw: string, defaultCc = "20"): string {
  if (!raw) return "";
  let s = raw.replace(/[\s()-]/g, "");
  if (s.startsWith("+")) return s;
  s = s.replace(/^00/, "");
  // Local Egyptian mobile: 01XXXXXXXXX -> +201XXXXXXXXX
  if (s.startsWith("0")) return `+${defaultCc}${s.slice(1)}`;
  if (s.startsWith(defaultCc)) return `+${s}`;
  return `+${s}`;
}
