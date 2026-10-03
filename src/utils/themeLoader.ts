import type { App } from "obsidian";
import { normalizeTheme, type DashboardTheme } from "./themes";

export const THEMES_FOLDER = "dashboard-themes";

export async function ensureThemesFolder(app: App): Promise<void> {
  const exists = await app.vault.adapter.exists(THEMES_FOLDER);
  if (!exists) await app.vault.createFolder(THEMES_FOLDER);
}

export async function loadCustomThemes(app: App): Promise<DashboardTheme[]> {
  try {
    const exists = await app.vault.adapter.exists(THEMES_FOLDER);
    if (!exists) return [];

    const listing = await app.vault.adapter.list(THEMES_FOLDER);
    const files = listing.files.filter((p) => p.toLowerCase().endsWith(".json"));

    const result: DashboardTheme[] = [];

    for (const path of files) {
      try {
        const raw = await app.vault.adapter.read(path);
        const parsed = JSON.parse(raw);
        const fileId = (path.split("/").pop() ?? path).replace(/\.json$/i, "");
        const theme = normalizeTheme(parsed, fileId);
        if (theme) result.push({ ...theme, source: path });
      } catch (e) {
        console.warn(`[Matreshka] Тема не прочитана: ${path}`, e);
      }
    }

    return result;
  } catch (e) {
    console.warn("[Matreshka] Ошибка загрузки тем", e);
    return [];
  }
}

const TEMPLATE = {
  id: "my-theme",
  label: "Моя тема",
  description: "Описание темы",
  preview: ["#08090f", "#7c3aed", "#22d3ee", "#d4d8e8"],
  colors: {
    bg: "#08090f",
    bgSoft: "#0d0f18",
    text: "#d4d8e8",
    textSecondary: "#a1a6b9",
    textMuted: "#6b7086",
    textFaint: "#4a4e62",
    panel: "#13151f",
    panelHover: "#171a26",
    panelBorder: "rgba(124, 58, 237, 0.16)",
    accent: "#7c3aed",
    accentLight: "#a78bfa",
    accent2: "#22d3ee",
    accentText: "#ffffff",
    grid: "rgba(124, 58, 237, 0.08)",
    glow: "rgba(124, 58, 237, 0.22)",
    scrollbar: "rgba(124, 58, 237, 0.25)",
    miroPort: "#7c3aed",
    radial1: "rgba(124, 58, 237, 0.12)",
    radial2: "rgba(34, 211, 238, 0.06)",
  },
  ui: {
    radius: "12px",
    radiusSm: "8px",
    blur: "0px",
    shadow: "0 8px 32px rgba(0,0,0,0.45)",
    font: '"JetBrains Mono", ui-monospace, monospace',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    borderWidth: "1px",
    letterSpacing: "-0.01em",
    gridSize: "32px",
  },
  css: ".nexus-dashboard-root[data-theme=\"my-theme\"] .glass-panel { transition: transform .15s ease; }\n.nexus-dashboard-root[data-theme=\"my-theme\"] .glass-panel:hover { transform: translateY(-2px); }",
};

export async function createThemeTemplate(app: App): Promise<string> {
  await ensureThemesFolder(app);
  const path = `${THEMES_FOLDER}/my-theme-${Date.now()}.json`;
  await app.vault.create(path, JSON.stringify(TEMPLATE, null, 2));
  return path;
}