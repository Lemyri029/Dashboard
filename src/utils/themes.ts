import type { CSSProperties } from "react";
import einkPaperRaw from "../data/themes/E-Ink.json";

export type ThemeId = string;
export const DEFAULT_THEME: ThemeId = "eink-paper";

export interface ThemeColors {
  bg: string;
  bgSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  panel: string;
  panelHover: string;
  panelBorder: string;
  accent: string;
  accentLight: string;
  accent2: string;
  accentText: string;
  grid: string;
  glow: string;
  scrollbar: string;
  miroPort: string;
  radial1: string;
  radial2: string;
}

export interface ThemeUi {
  radius: string;
  radiusSm: string;
  blur: string;
  shadow: string;
  font: string;
  fontMono: string;
  borderWidth: string;
  letterSpacing: string;
  gridSize: string;
}

export interface DashboardTheme {
  id: ThemeId;
  label: string;
  description: string;
  preview: [string, string, string, string];
  colors: ThemeColors;
  ui: ThemeUi;
  css?: string;
  source?: string;
}

export const BASE_COLORS: ThemeColors = {
  bg: "#05070a",
  bgSoft: "#0b1016",
  text: "#e6edf3",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  textFaint: "#64748b",
  panel: "rgba(10, 14, 20, 0.94)",
  panelHover: "rgba(16, 22, 30, 0.96)",
  panelBorder: "rgba(255, 255, 255, 0.07)",
  accent: "#22d3ee",
  accentLight: "#67e8f9",
  accent2: "#a855f7",
  accentText: "#04121a",
  grid: "rgba(56, 232, 255, 0.06)",
  glow: "rgba(56, 232, 255, 0.28)",
  scrollbar: "rgba(56, 232, 255, 0.25)",
  miroPort: "#38e8ff",
  radial1: "rgba(45, 212, 255, 0.15)",
  radial2: "rgba(168, 85, 247, 0.12)",
};

export const BASE_UI: ThemeUi = {
  radius: "12px",
  radiusSm: "8px",
  blur: "12px",
  shadow: "0 0 24px -8px rgba(56,232,255,.25)",
  font: '"Sora", "Inter", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
  borderWidth: "1px",
  letterSpacing: "normal",
  gridSize: "32px",
};

/** Светлая база: подставляется, если у загруженной темы светлый фон */
export const BASE_COLORS_LIGHT: ThemeColors = {
  bg: "#f2f4f7",
  bgSoft: "#e7ebf0",
  text: "#1c2330",
  textSecondary: "#333c4d",
  textMuted: "#5b6675",
  textFaint: "#8a94a3",
  panel: "rgba(255, 255, 255, 0.94)",
  panelHover: "rgba(255, 255, 255, 0.98)",
  panelBorder: "rgba(16, 24, 40, 0.10)",
  accent: "#0891b2",
  accentLight: "#06b6d4",
  accent2: "#7c3aed",
  accentText: "#ffffff",
  grid: "rgba(8, 145, 178, 0.08)",
  glow: "rgba(8, 145, 178, 0.20)",
  scrollbar: "rgba(8, 145, 178, 0.25)",
  miroPort: "#0891b2",
  radial1: "rgba(8, 145, 178, 0.10)",
  radial2: "rgba(124, 58, 237, 0.08)",
};

/** Яркость hex-цвета: 0 = чёрный, 1 = белый. null, если цвет не в hex-формате */
function luminance(color: string): number | null {
  let hex = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex.split("").map((ch) => ch + ch).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function mk(
  id: string,
  label: string,
  description: string,
  preview: [string, string, string, string],
  colors: Partial<ThemeColors>,
  ui: Partial<ThemeUi> = {}
): DashboardTheme {
  return {
    id,
    label,
    description,
    preview,
    colors: { ...BASE_COLORS, ...colors },
    ui: { ...BASE_UI, ...ui },
  };
}

const EINK_THEME: DashboardTheme =
  normalizeTheme(einkPaperRaw, "eink-paper") ??
  mk("eink-paper", "Ink Paper", "Электронная бумага", ["#eeeece", "#141414", "#5c5c5c", "#f7f6f1"], {
    bg: "#eeeece",
    bgSoft: "#e4e1d7",
    text: "#141414",
    textSecondary: "#262626",
    textMuted: "#3f3f3f",
    textFaint: "#5c5c5c",
    panel: "#f7f6f1",
    panelHover: "#fdfcf8",
    panelBorder: "rgba(20, 20, 20, 0.62)",
    accent: "#141414",
    accentLight: "#2e2e2e",
    accent2: "#4a4a4a",
    accentText: "#f7f6f1",
    grid: "rgba(20, 20, 20, 0.07)",
    glow: "rgba(20, 20, 20, 0.16)",
    scrollbar: "rgba(20, 20, 20, 0.32)",
    miroPort: "#141414",
    radial1: "rgba(0, 0, 0, 0)",
    radial2: "rgba(0, 0, 0, 0)",
  }, {
    radius: "6px",
    radiusSm: "4px",
    blur: "0px",
    shadow: "2px 2px 0 0 rgba(20, 20, 20, 0.85)",
    font: '"Literata", "Bookerly", Georgia, "PT Serif", "Times New Roman", serif',
    fontMono: '"JetBrains Mono", "IBM Plex Mono", Consolas, monospace',
    borderWidth: "1px",
    letterSpacing: "0.005em",
    gridSize: "24px",
  });

export const THEME_LIST: DashboardTheme[] = [
  EINK_THEME,

  mk("lemo", "Lemo", "Неоновая базовая", ["#05070a", "#22d3ee", "#a855f7", "#e6edf3"], {}),

  mk("techno-minimal", "Techno Minimal", "Фиолетовый минимал", ["#08090f", "#7c3aed", "#22d3ee", "#cbd5e1"], {
    bg: "#08090f", bgSoft: "#0d0f18", text: "#d4d8e8", textSecondary: "#a1a6b9",
    textMuted: "#6b7086", textFaint: "#4a4e62",
    panel: "#13151f", panelHover: "#171a26", panelBorder: "rgba(124, 58, 237, 0.16)",
    accent: "#7c3aed", accentLight: "#a78bfa", accent2: "#22d3ee", accentText: "#ffffff",
    grid: "rgba(124, 58, 237, 0.08)", glow: "rgba(124, 58, 237, 0.22)",
    scrollbar: "rgba(124, 58, 237, 0.25)", miroPort: "#7c3aed",
    radial1: "rgba(124, 58, 237, 0.12)", radial2: "rgba(34, 211, 238, 0.06)",
  }, {
    blur: "0px",
    shadow: "0 8px 32px rgba(0,0,0,0.45)",
    font: '"JetBrains Mono", ui-monospace, monospace',
    letterSpacing: "-0.01em",
  }),

  mk("nord", "Nord", "Северные льды", ["#2e3440", "#88c0d0", "#b48ead", "#eceff4"], {
    bg: "#2e3440", bgSoft: "#3b4252", text: "#eceff4", textSecondary: "#e5e9f0",
    textMuted: "#d8dee9", textFaint: "#9aa6b2",
    panel: "rgba(59, 66, 82, 0.92)", panelHover: "rgba(67, 76, 94, 0.95)",
    panelBorder: "rgba(216, 222, 233, 0.14)",
    accent: "#88c0d0", accentLight: "#8fbcbb", accent2: "#b48ead", accentText: "#2e3440",
    grid: "rgba(136, 192, 208, 0.08)", glow: "rgba(136, 192, 208, 0.28)",
    scrollbar: "rgba(136, 192, 208, 0.28)", miroPort: "#88c0d0",
    radial1: "rgba(136, 192, 208, 0.16)", radial2: "rgba(180, 142, 173, 0.14)",
  }),

  mk("dracula", "Dracula", "Фиолетовая классика", ["#282a36", "#bd93f9", "#ff79c6", "#f8f8f2"], {
    bg: "#282a36", bgSoft: "#343746", text: "#f8f8f2", textSecondary: "#e2e4ef",
    textMuted: "#c7c9d8", textFaint: "#9ca0b0",
    panel: "rgba(40, 42, 54, 0.94)", panelHover: "rgba(52, 55, 70, 0.96)",
    panelBorder: "rgba(248, 248, 242, 0.10)",
    accent: "#bd93f9", accentLight: "#d6b6ff", accent2: "#ff79c6", accentText: "#282a36",
    grid: "rgba(189, 147, 249, 0.08)", glow: "rgba(189, 147, 249, 0.30)",
    scrollbar: "rgba(189, 147, 249, 0.28)", miroPort: "#bd93f9",
    radial1: "rgba(189, 147, 249, 0.16)", radial2: "rgba(255, 121, 198, 0.12)",
  }),

  mk("catppuccin", "Catppuccin", "Мягкая пастель", ["#1e1e2e", "#89b4fa", "#cba6f7", "#cdd6f4"], {
    bg: "#1e1e2e", bgSoft: "#282839", text: "#cdd6f4", textSecondary: "#bac2de",
    textMuted: "#a6adc8", textFaint: "#7f849c",
    panel: "rgba(30, 30, 46, 0.94)", panelHover: "rgba(40, 40, 57, 0.96)",
    panelBorder: "rgba(205, 214, 244, 0.10)",
    accent: "#89b4fa", accentLight: "#b4befe", accent2: "#cba6f7", accentText: "#1e1e2e",
    grid: "rgba(137, 180, 250, 0.08)", glow: "rgba(137, 180, 250, 0.28)",
    scrollbar: "rgba(137, 180, 250, 0.26)", miroPort: "#89b4fa",
    radial1: "rgba(137, 180, 250, 0.16)", radial2: "rgba(203, 166, 247, 0.12)",
  }, { radius: "16px", radiusSm: "10px" }),

  mk("everforest", "Everforest", "Лесная", ["#2d353b", "#a7c080", "#e69875", "#d3c6aa"], {
    bg: "#2d353b", bgSoft: "#343f44", text: "#d3c6aa", textSecondary: "#d3c6aa",
    textMuted: "#a7c080", textFaint: "#859289",
    panel: "rgba(52, 63, 68, 0.94)", panelHover: "rgba(61, 72, 77, 0.96)",
    panelBorder: "rgba(211, 198, 170, 0.12)",
    accent: "#a7c080", accentLight: "#c6d4a2", accent2: "#e69875", accentText: "#2d353b",
    grid: "rgba(167, 192, 128, 0.08)", glow: "rgba(167, 192, 128, 0.26)",
    scrollbar: "rgba(167, 192, 128, 0.26)", miroPort: "#a7c080",
    radial1: "rgba(167, 192, 128, 0.16)", radial2: "rgba(230, 152, 117, 0.12)",
  }, { radius: "10px" }),

  mk("rosepine", "Rosé Pine", "Розовый сумрак", ["#191724", "#ebbcba", "#c4a7e7", "#e0def4"], {
    bg: "#191724", bgSoft: "#1f1d2e", text: "#e0def4", textSecondary: "#e0def4",
    textMuted: "#908caa", textFaint: "#6e6a86",
    panel: "rgba(31, 29, 46, 0.94)", panelHover: "rgba(38, 35, 58, 0.96)",
    panelBorder: "rgba(224, 222, 244, 0.10)",
    accent: "#ebbcba", accentLight: "#f2cdcd", accent2: "#c4a7e7", accentText: "#191724",
    grid: "rgba(235, 188, 186, 0.08)", glow: "rgba(235, 188, 186, 0.26)",
    scrollbar: "rgba(235, 188, 186, 0.26)", miroPort: "#ebbcba",
    radial1: "rgba(235, 188, 186, 0.14)", radial2: "rgba(196, 167, 231, 0.14)",
  }, { radius: "14px" }),

  mk("cyberpunk", "Cyberpunk", "Неон мегаполиса", ["#0d0221", "#ff2a6d", "#05d9e8", "#d1f7ff"], {
    bg: "#0d0221", bgSoft: "#160532", text: "#d1f7ff", textSecondary: "#c4f0f7",
    textMuted: "#8ba8b3", textFaint: "#6b7c8a",
    panel: "rgba(22, 5, 50, 0.94)", panelHover: "rgba(30, 8, 66, 0.96)",
    panelBorder: "rgba(5, 217, 232, 0.18)",
    accent: "#ff2a6d", accentLight: "#ff6b9d", accent2: "#05d9e8", accentText: "#ffffff",
    grid: "rgba(255, 42, 109, 0.10)", glow: "rgba(255, 42, 109, 0.32)",
    scrollbar: "rgba(255, 42, 109, 0.30)", miroPort: "#ff2a6d",
    radial1: "rgba(255, 42, 109, 0.16)", radial2: "rgba(5, 217, 232, 0.14)",
  }, {
    radius: "4px", radiusSm: "2px", blur: "4px",
    shadow: "0 0 30px -6px rgba(255,42,109,.45)",
    font: '"JetBrains Mono", ui-monospace, monospace',
  }),

  mk("amber", "Amber Night", "Тёплый янтарь", ["#0c0a09", "#f59e0b", "#f97316", "#fef3c7"], {
    bg: "#0c0a09", bgSoft: "#1c1917", text: "#fef3c7", textSecondary: "#fde68a",
    textMuted: "#d6c48a", textFaint: "#a8a29e",
    panel: "rgba(28, 25, 23, 0.94)", panelHover: "rgba(38, 34, 31, 0.96)",
    panelBorder: "rgba(245, 158, 11, 0.16)",
    accent: "#f59e0b", accentLight: "#fbbf24", accent2: "#f97316", accentText: "#0c0a09",
    grid: "rgba(245, 158, 11, 0.08)", glow: "rgba(245, 158, 11, 0.28)",
    scrollbar: "rgba(245, 158, 11, 0.28)", miroPort: "#f59e0b",
    radial1: "rgba(245, 158, 11, 0.16)", radial2: "rgba(249, 115, 22, 0.12)",
  }),
];

/** Превращает произвольный JSON из файла в валидную тему */
export function normalizeTheme(raw: unknown, fallbackId: string): DashboardTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : fallbackId;

  // 1. Смотрим на фон темы: если он светлый — берём светлую базу, 
  //    чтобы текст и панели были читаемыми даже если автор темы
  //    не задал эти цвета явно.
  const rawBg = typeof r.colors?.bg === "string" ? r.colors.bg : BASE_COLORS.bg;
  const bgLum = luminance(rawBg);
  const base = bgLum !== null && bgLum > 0.35 ? BASE_COLORS_LIGHT : BASE_COLORS;

  // 2. Цвета, явно заданные в JSON, всегда в приоритете над базой.
  const colors: ThemeColors = { ...base, ...(r.colors ?? {}) };

  // 3. Если не задан цвет текста на акцентных кнопках — подбираем
  //    автоматически по яркости акцента.
  if (typeof r.colors?.accentText !== "string") {
    const aLum = luminance(colors.accent);
    if (aLum !== null) colors.accentText = aLum > 0.35 ? "#0b0f14" : "#ffffff";
  }

  const ui: ThemeUi = { ...BASE_UI, ...(r.ui ?? {}) };

  const preview: [string, string, string, string] =
    Array.isArray(r.preview) && r.preview.length === 4
      ? (r.preview as [string, string, string, string])
      : [colors.bg, colors.accent, colors.accent2, colors.text];

  return {
    id,
    label: typeof r.label === "string" && r.label ? r.label : id,
    description: typeof r.description === "string" ? r.description : "Пользовательская тема",
    preview,
    colors,
    ui,
    css: typeof r.css === "string" ? r.css : undefined,
  };
}

export function getTheme(themeId?: ThemeId | null, extra: DashboardTheme[] = []): DashboardTheme {
  return (
    extra.find((t) => t.id === themeId) ??
    THEME_LIST.find((t) => t.id === themeId) ??
    THEME_LIST.find((t) => t.id === DEFAULT_THEME) ??
    THEME_LIST[0]
  );
}

export function getThemeStyle(themeId?: ThemeId | null, extra: DashboardTheme[] = []): CSSProperties {
  const t = getTheme(themeId, extra);
  const c = t.colors;
  const u = t.ui;

  return {
    "--nd-bg": c.bg,
    "--nd-bg-soft": c.bgSoft,
    "--nd-text": c.text,
    "--nd-text-secondary": c.textSecondary,
    "--nd-text-muted": c.textMuted,
    "--nd-text-faint": c.textFaint,
    "--nd-panel": c.panel,
    "--nd-panel-hover": c.panelHover,
    "--nd-panel-border": c.panelBorder,
    "--nd-accent": c.accent,
    "--nd-accent-light": c.accentLight,
    "--nd-accent-2": c.accent2,
    "--nd-accent-text": c.accentText,
    "--nd-grid": c.grid,
    "--nd-glow": c.glow,
    "--nd-scrollbar": c.scrollbar,
    "--nd-miro-port": c.miroPort,
    "--nd-radial-1": c.radial1,
    "--nd-radial-2": c.radial2,
    "--nd-radius": u.radius,
    "--nd-radius-sm": u.radiusSm,
    "--nd-blur": u.blur,
    "--nd-shadow": u.shadow,
    "--nd-font": u.font,
    "--nd-font-mono": u.fontMono,
    "--nd-border-width": u.borderWidth,
    "--nd-letter-spacing": u.letterSpacing,
    "--nd-grid-size": u.gridSize,
    "--color-cyan-200": c.accentLight,
    "--color-cyan-300": c.accentLight,
    "--color-cyan-400": c.accent,
    "--color-cyan-500": c.accent,
    "--color-slate-100": c.text,
    "--color-slate-200": c.text,
    "--color-slate-300": c.textSecondary,
    "--color-slate-400": c.textMuted,
    "--color-slate-500": c.textFaint,
    "--color-slate-600": c.textFaint,
    "--background-primary": c.bg,
  } as CSSProperties;
}