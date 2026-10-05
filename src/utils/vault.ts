import type { FileKind, VaultFile } from "../types";
import { DEFAULT_LANGUAGE, t, type LanguageId } from "../i18n";

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

export function formatBytes(
  bytes?: number,
  language: LanguageId = DEFAULT_LANGUAGE
): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "—";

  const units = [
    "vault.size.bytes",
    "vault.size.kb",
    "vault.size.mb",
    "vault.size.gb",
  ] as const;

  if (bytes === 0) return `0 ${t(units[0], language)}`;

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const value = (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1);
  return `${value} ${t(units[index] ?? units[0], language)}`;
}

/** Старый список оставляем: его могут использовать другие файлы. */
export const KIND_LABEL: Record<FileKind, string> = {
  folder: "Папка",
  markdown: "Markdown",
  text: "Текст",
  pdf: "PDF",
  flowchart: "Доска",
  executable: "Программа",
  image: "Изображение",
  other: "Файл",
};

/** Используй эту функцию там, где название должно меняться вместе с языком. */
export function getKindLabel(kind: FileKind, language: LanguageId): string {
  const key = `vault.kind.${kind}`;
  const translated = t(key, language);

  return translated === key ? KIND_LABEL[kind] ?? kind : translated;
}

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