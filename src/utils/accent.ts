export type Accent = "cyan" | "violet" | "amber" | "rose" | "emerald" | "slate";

export const ACCENTS: Accent[] = ["cyan", "violet", "amber", "rose", "emerald", "slate"];

interface AccentClasses {
  ring: string;
  text: string;
  bg: string;
  dot: string;
  border: string;
}

const MAP: Record<Accent, AccentClasses> = {
  cyan: {
    ring: "ring-cyan-400/20",
    text: "text-cyan-300",
    bg: "bg-cyan-400/10",
    dot: "bg-cyan-400",
    border: "border-cyan-400/25",
  },
  violet: {
    ring: "ring-violet-400/20",
    text: "text-violet-300",
    bg: "bg-violet-400/10",
    dot: "bg-violet-400",
    border: "border-violet-400/25",
  },
  amber: {
    ring: "ring-amber-400/20",
    text: "text-amber-300",
    bg: "bg-amber-400/10",
    dot: "bg-amber-400",
    border: "border-amber-400/25",
  },
  rose: {
    ring: "ring-rose-400/20",
    text: "text-rose-300",
    bg: "bg-rose-400/10",
    dot: "bg-rose-400",
    border: "border-rose-400/25",
  },
  emerald: {
    ring: "ring-emerald-400/20",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    dot: "bg-emerald-400",
    border: "border-emerald-400/25",
  },
  slate: {
    ring: "ring-slate-400/20",
    text: "text-slate-300",
    bg: "bg-slate-400/10",
    dot: "bg-slate-400",
    border: "border-slate-400/25",
  },
};

export function accentClasses(accent?: string): AccentClasses {
  return MAP[(accent as Accent) || "cyan"] ?? MAP.cyan;
}
