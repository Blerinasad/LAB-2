export const initials = (u) =>
  u ? `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() : "?";

export const expiryStatus = (days) => {
  if (days === null || days === undefined) return "safe";
  if (days < 0) return "expired";
  if (days <= 2) return "danger";
  if (days <= 5) return "warn";
  return "safe";
};

export const expiryColor = (days) => ({
  expired: "var(--danger)",
  danger: "var(--danger)",
  warn: "var(--gold)",
  safe: "var(--olive)",
}[expiryStatus(days)]);

export const expiryLabel = (days) => {
  if (days === null || days === undefined) return "–";
  if (days < 0) return "Skaduar";
  if (days === 0) return "Sot";
  return `${days}d`;
};

export const DAYS_ALB = ["E Hënë","E Martë","E Mërkurë","E Enjte","E Premte","E Shtunë","E Diel"];

export const MEAL_LABELS = {
  breakfast: "Mëngjes",
  lunch: "Drekë",
  dinner: "Darkë",
  snack: "Rostiçeri",
};

export const DIFF_LABELS = { easy:"Lehtë", medium:"Mesatare", hard:"Vështirë" };
export const DIFF_COLORS = { easy:"badge-sage", medium:"badge-gold", hard:"badge-danger" };

export const fmtDate = (d) => d ? String(d).slice(0, 10) : "–";
