export const SELECT_OPTION_COLORS = {
  slate: {
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    column: "bg-slate-500/5 border-slate-500/20",
  },
  blue: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    column: "bg-blue-500/5 border-blue-500/20",
  },
  green: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    column: "bg-emerald-500/5 border-emerald-500/20",
  },
  yellow: {
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    column: "bg-amber-500/5 border-amber-500/20",
  },
  orange: {
    pill: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    column: "bg-orange-500/5 border-orange-500/20",
  },
  red: {
    pill: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
    column: "bg-red-500/5 border-red-500/20",
  },
  purple: {
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200",
    column: "bg-purple-500/5 border-purple-500/20",
  },
  pink: {
    pill: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-200",
    column: "bg-pink-500/5 border-pink-500/20",
  },
} as const;

export type SelectOptionColor = keyof typeof SELECT_OPTION_COLORS;

export function selectOptionColor(color: string) {
  return SELECT_OPTION_COLORS[color as SelectOptionColor] ?? SELECT_OPTION_COLORS.slate;
}
