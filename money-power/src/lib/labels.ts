import type { BudgetDecision, WasteFlag } from "./calc";

export const WASTE_FLAG_TONE: Record<WasteFlag, "cut" | "watch" | "calm" | "neutral"> = {
  Cut: "cut",
  Watch: "watch",
  Core: "calm",
  Protected: "calm",
};

export const DECISION_TONE: Record<BudgetDecision, "cut" | "watch" | "calm"> = {
  "CUT / RESET": "cut",
  WATCH: "watch",
  "ON TRACK": "calm",
};

export const PRIORITY_LABELS: Record<string, string> = {
  CutNow: "Cut Now",
  Reduce: "Reduce",
  Review: "Review",
  Keep: "Keep",
};

export const CONFIRMATION_LABELS: Record<string, string> = {
  NeedsConfirmation: "Needs confirmation",
  Confirmed: "Confirmed",
};

export const PAY_FREQUENCIES = ["Weekly", "Biweekly", "Semimonthly", "Monthly", "Irregular"] as const;
export const BILL_FREQUENCIES = [
  "Weekly",
  "Biweekly",
  "Semimonthly",
  "Monthly",
  "Quarterly",
  "Annual",
] as const;
export const GROUPS = ["Essential", "Flexible", "Goals"] as const;
export const NEED_WANTS = ["Need", "Want"] as const;
export const WASTE_FLAGS = ["Core", "Protected", "Watch", "Cut"] as const;
export const PRIORITIES = ["CutNow", "Reduce", "Review", "Keep"] as const;
