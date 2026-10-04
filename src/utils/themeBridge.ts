/**
 * themeBridge.ts — доводит тему из .json до ВСЕГО проекта:
 * sidebar, календарь, модалки, инпуты и компоненты с жёсткими цветами.
 *
 * Состоит из двух частей:
 *  1) paletteOverrides()  — подменяет палитру Tailwind (slate/gray/white/cyan/...) на цвета темы.
 *                           Работает для ЛЮБЫХ классов вида text-slate-400, bg-white/5, border-white/10,
 *                           text-cyan-400, bg-slate-900 и т.д. — без правки компонентов.
 *  2) BRIDGE_CSS          — перехватывает то, что классами не достать: inline-стили с жёсткими цветами
 *                           (style={{ backgroundColor: "#22d3ee" }}) и нативные контролы.
 */

export interface PaletteColors {
  bg: string;
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
}

const NEUTRALS = ["slate", "gray", "zinc", "neutral", "stone"] as const;
const PRIMARY = ["cyan", "sky", "blue", "teal"] as const;
const SECONDARY = ["violet", "purple", "fuchsia", "indigo"] as const;

/** Светлая ли тема — нужно для color-scheme (нативные date/time/select). */
export function isLightColor(color: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}

export function paletteOverrides(c: PaletteColors): Record<string, string> {
  const o: Record<string, string> = {};

  // Нейтральные: текст светлых оттенков → цвета текста темы,
  // тёмные оттенки (700…950) → поверхности темы.
  for (const n of NEUTRALS) {
    o[`--color-${n}-50`] = c.text;
    o[`--color-${n}-100`] = c.text;
    o[`--color-${n}-200`] = c.text;
    o[`--color-${n}-300`] = c.textSecondary;
    o[`--color-${n}-400`] = c.textMuted;
    o[`--color-${n}-500`] = c.textFaint;
    o[`--color-${n}-600`] = c.textFaint;
    o[`--color-${n}-700`] = c.panelBorder;
    o[`--color-${n}-800`] = c.panelHover;
    o[`--color-${n}-900`] = c.panel;
    o[`--color-${n}-950`] = c.bg;
  }

  // Акцентные семейства → accent / accent2 темы.
  // Статусные цвета (emerald, amber, rose, red) намеренно не трогаем.
  for (const n of PRIMARY) {
    for (const step of [50, 100, 200, 300]) o[`--color-${n}-${step}`] = c.accentLight;
    for (const step of [400, 500, 600, 700, 800, 900]) o[`--color-${n}-${step}`] = c.accent;
  }
  for (const n of SECONDARY) {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      o[`--color-${n}-${step}`] = c.accent2;
    }
  }

  // bg-white/5, border-white/10, hover:bg-white/10 — это «полупрозрачный цвет текста»:
  // на тёмной теме он светлый, на светлой — тёмный. Именно это и нужно.
  o["--color-white"] = c.text;
  o["--color-black"] = c.bg;

  return o;
}

export const BRIDGE_CSS = `/* ===== Theme bridge ===== */

/* 1) Семантические хуки — повесьте data-nd на корни компонентов */
.nexus-dashboard-root [data-nd="sidebar"] {
  background: var(--nd-panel);
  border-color: var(--nd-panel-border);
  color: var(--nd-text);
}
.nexus-dashboard-root [data-nd="calendar"] {
  color: var(--nd-text-secondary);
  border-color: var(--nd-panel-border);
}

/* 2) inline-стили с жёстким циановым акцентом (#22d3ee) */
.nexus-dashboard-root [style*="background-color: rgb(34, 211, 238)"] {
  background-color: var(--nd-accent) !important;
  color: var(--nd-accent-text) !important;
  box-shadow: 0 0 12px var(--nd-glow) !important;
}
.nexus-dashboard-root [style*="background-color: rgb(34, 211, 238)"] svg {
  color: var(--nd-accent-text) !important;
}

/* 3) inline-стили «белое с прозрачностью» и светлый текст */
.nexus-dashboard-root [style*="background-color: rgba(255, 255, 255, 0.03)"],
.nexus-dashboard-root [style*="background-color: rgba(255, 255, 255, 0.04)"],
.nexus-dashboard-root [style*="background-color: rgba(255, 255, 255, 0.05)"] {
  background-color: color-mix(in srgb, var(--nd-text) 6%, transparent) !important;
}
.nexus-dashboard-root [style*="color: rgb(226, 232, 240)"] {
  color: var(--nd-text) !important;
}
.nexus-dashboard-root [style*="solid rgba(255, 255, 255, 0.1)"] {
  border-color: var(--nd-panel-border) !important;
}

/* 4) нативные контролы: date / time / select / option */
.nexus-dashboard-root input[type="date"],
.nexus-dashboard-root input[type="time"],
.nexus-dashboard-root input[type="number"],
.nexus-dashboard-root select {
  color-scheme: inherit;
}
.nexus-dashboard-root select option {
  background: var(--nd-bg-soft);
  color: var(--nd-text);
}
`;
