/** "2 min ago", "3 h ago", "Oct 14" — compact, for tables. */
export function timeAgo(d: Date, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** 1250 -> "1,250" */
export function money(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** "Mariam Hassan" -> "MH" */
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export const STATUS_TONE: Record<string, string> = {
  received: "neutral",
  confirming: "warn",
  confirmed: "ok",
  shipped: "ok",
  cancelled: "bad",
};
