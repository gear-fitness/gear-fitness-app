import { Height, Weight } from "./types";

export function heightToInches(h?: Height): number | null {
  if (!h) return null;
  if (h.unit === "ft_in") return h.ft * 12 + h.inch;
  return Math.round(h.cm / 2.54);
}

export function weightToLbs(w?: Weight): number | null {
  if (!w) return null;
  if (w.unit === "lbs") return w.value;
  return Math.round(w.value * 2.205);
}

export function formatWeight(w?: Weight): string {
  if (!w) return "—";
  return `${w.value} ${w.unit}`;
}

export function formatHeight(h?: Height): string {
  if (!h) return "—";
  if (h.unit === "ft_in") return `${h.ft}' ${h.inch}"`;
  return `${h.cm} cm`;
}
