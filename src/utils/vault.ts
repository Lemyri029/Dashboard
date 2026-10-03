import type { FileKind, VaultFile } from "../types";

export function findFile(nodes: VaultFile[], id: string): VaultFile | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findFile(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function findFileByPath(nodes: VaultFile[], path: string): VaultFile | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const found = findFileByPath(n.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export function flattenFiles(nodes: VaultFile[]): VaultFile[] {
  const out: VaultFile[] = [];
  const walk = (items: VaultFile[]) => {
    for (const item of items) {
      out.push(item);
      if (item.children) walk(item.children);
    }
  };
  walk(nodes);
  return out;
}

export function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes === 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const KIND_LABEL: Record<FileKind, string> = {
  folder: "Папка",
  markdown: "Markdown",
  text: "Текст",
  pdf: "PDF",
  hostly: "Hostly",
  flowchart: "Доска",
  executable: "Программа",
  image: "Изображение",
  other: "Файл",
};

const LAUNCHABLE_EXTENSIONS = [
  ".lnk",
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".vbs",
  ".url",
  ".msi",
  ".com",
];

export function isLaunchable(file: VaultFile): boolean {
  const path = file.path.toLowerCase();

  return (
    file.kind === "executable" ||
    LAUNCHABLE_EXTENSIONS.some((extension) => path.endsWith(extension))
  );
}