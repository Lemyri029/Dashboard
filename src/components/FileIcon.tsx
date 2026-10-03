import {
  FileText,
  FileCode2,
  FileType,
  Network,
  Server,
  AppWindow,
  Folder,
  Image as ImageIcon,
  File as FileIcon2,
  LucideIcon,
} from "lucide-react";
import type { FileKind } from "../types";
import { cn } from "../utils/cn";

const ICONS: Record<FileKind, LucideIcon> = {
  folder: Folder,
  markdown: FileText,
  text: FileCode2,
  pdf: FileType,
  hostly: Server,
  flowchart: Network,
  executable: AppWindow,
  image: ImageIcon,
  other: FileIcon2,
};

const COLORS: Record<FileKind, string> = {
  folder: "text-sky-400",
  markdown: "text-cyan-300",
  text: "text-slate-300",
  pdf: "text-rose-400",
  hostly: "text-amber-300",
  flowchart: "text-violet-300",
  executable: "text-emerald-300",
  image: "text-pink-300",
  other: "text-slate-400",
};

export function FileIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const Icon = ICONS[kind] ?? FileIcon2;
  return <Icon className={cn("shrink-0", COLORS[kind], className)} />;
}
