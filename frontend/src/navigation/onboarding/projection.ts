import { OnboardingDraft } from "./types";
import { weightToLbs } from "./units";

export interface Projection {
  deltaLbs: number;
  direction: "up" | "down";
  weeks: number;
  targetDate: Date;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Projected timeline to the goal weight at a sustainable pace
 *  (~1.5 lb/week down, ~0.5 lb/week up). Null when there is no
 *  meaningful weight delta to project. */
export function computeProjection(
  draft: Pick<OnboardingDraft, "weight" | "goalWeight">,
): Projection | null {
  const current = weightToLbs(draft.weight);
  const goal = weightToLbs(draft.goalWeight);
  if (current == null || goal == null) return null;

  const deltaLbs = goal - current;
  if (Math.abs(deltaLbs) < 2) return null;

  const direction = deltaLbs < 0 ? "down" : "up";
  const rate = direction === "down" ? 1.5 : 0.5;
  const weeks = Math.max(4, Math.ceil(Math.abs(deltaLbs) / rate));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeks * 7);

  return { deltaLbs, direction, weeks, targetDate };
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthDay(d: Date): string {
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
