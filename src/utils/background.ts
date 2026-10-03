import { App, TFile, FuzzySuggestModal } from "obsidian";
import type { BackgroundSettings } from "../types";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg"];

export function resolveBackgroundUrl(app: App | null, bg: BackgroundSettings): string | null {
  if (!bg.enabled) return null;
  if (bg.imagePath && app) {
    const file = app.vault.getAbstractFileByPath(bg.imagePath);
    if (file instanceof TFile) return app.vault.getResourcePath(file);
  }
  if (bg.imageUrl) return bg.imageUrl;
  return null;
}

export async function saveBackgroundFile(
  app: App,
  file: File,
  folder = "dashboard-assets"
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
  const path = `${folder}/background-${Date.now()}.${ext}`;
  await app.vault.createBinary(path, buffer);
  return path;
}

export class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private onChoose: (file: TFile) => void) {
    super(app);
    this.setPlaceholder("Выберите изображение из хранилища…");
  }
  getItems(): TFile[] {
    return this.app.vault
      .getFiles()
      .filter((f) => IMAGE_EXTENSIONS.includes(f.extension.toLowerCase()));
  }
  getItemText(item: TFile): string {
    return item.path;
  }
  onChooseItem(item: TFile): void {
    this.onChoose(item);
  }
}