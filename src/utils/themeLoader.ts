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
        console.warn(`[Lemo] Тема не прочитана: ${path}`, e);
      }
    }

    return result;
  } catch (e) {
    console.warn("[Lemo] Ошибка загрузки тем", e);
    return [];
  }
}
