import { App, TFile, TFolder, TAbstractFile } from "obsidian";
import type { FileKind, VaultFile } from "../types";

// Определяем "тип" файла по расширению — так дашборд понимает,
// каким значком и каким просмотрщиком его показывать
function detectKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "md") return "markdown";
  if (ext === "txt") return "text";
  if (ext === "pdf") return "pdf";
  if (ext === "hostly") return "hostly";
  if (ext === "flow") return "flowchart";

  // Всё, что можно запускать как программу / ярлык
  if (
    [
      "exe",
      "lnk",
      "bat",
      "cmd",
      "ps1",
      "vbs",
      "url",
      "msi",
      "com",
      "app",
    ].includes(ext)
  ) {
    return "executable";
  }

  if (
    [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "svg",
      "webp",
      "bmp",
      "ico",
      "avif",
    ].includes(ext)
  ) {
    return "image";
  }

  return "other";
}

function sortChildren(items: TAbstractFile[]): TAbstractFile[] {
  return items.slice().sort((a, b) => {
    const aFolder = a instanceof TFolder;
    const bFolder = b instanceof TFolder;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name, "ru");
  });
}

function buildNode(file: TAbstractFile): VaultFile {
  if (file instanceof TFolder) {
    return {
      id: file.path,
      name: file.name,
      kind: "folder",
      path: file.path,
      children: sortChildren(file.children).map(buildNode),
    };
  }
  const tfile = file as TFile;
  return {
    id: tfile.path,
    name: tfile.name,
    kind: detectKind(tfile.name),
    path: tfile.path,
    size: tfile.stat.size,
    modified: new Date(tfile.stat.mtime).toISOString().slice(0, 10),
  };
}

// Строит дерево файлов дашборда из настоящего Vault
export function buildVaultTree(app: App): VaultFile[] {
  const root = app.vault.getRoot();
  return sortChildren(root.children).map(buildNode);
}

// Читает содержимое файла по пути (например, для просмотра заметки)
export async function readFileContent(app: App, path: string): Promise<string> {
  const f = app.vault.getAbstractFileByPath(path);
  if (f instanceof TFile) return app.vault.read(f);
  throw new Error("Файл не найден: " + path);
}

// Записывает содержимое файла (создаёт, если его ещё нет)
export async function writeFileContent(app: App, path: string, content: string): Promise<void> {
  const f = app.vault.getAbstractFileByPath(path);
  if (f instanceof TFile) {
    await app.vault.modify(f, content);
  } else {
    await app.vault.create(path, content);
  }
}