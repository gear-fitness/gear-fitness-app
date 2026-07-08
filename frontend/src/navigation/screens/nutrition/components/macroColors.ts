/**
 * Shared macro identity colors (yellow carbs / purple fat / pink-red protein),
 * tuned per scheme. One source so the tracker's summary card and the nutrition
 * detail sheet always agree.
 */
export const MACRO_COLORS = {
  carbs: { dark: "#FACC15", light: "#EAB308" },
  fat: { dark: "#BF5AF2", light: "#AF52DE" },
  protein: { dark: "#FF375F", light: "#F43F5E" },
} as const;

export type Macro = keyof typeof MACRO_COLORS;

export function macroColor(macro: Macro, isDark: boolean): string {
  return MACRO_COLORS[macro][isDark ? "dark" : "light"];
}
