// Core type definitions for the Obsidian-style dashboard

export type FileKind =
  | "folder"
  | "markdown"
  | "text"
  | "pdf"
  | "flowchart"
  | "executable"
  | "image"
  | "other";

export interface VaultFile {
  id: string;
  name: string;
  kind: FileKind;
  path: string;
  size?: number;
  modified?: string;
  content?: string;
  children?: VaultFile[];
  flowchartId?: string;
}

export interface BackgroundSettings {
  enabled: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  dim: number;
  blur: number;
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  enabled: true,
  imagePath: null,
  imageUrl: null,
  dim: 0.55,
  blur: 0,
};

export type BlockType =
  | "group"
  | "note"
  | "file-list"
  | "flowchart"
  | "link"
  | "graph"
  | "checklist"
  | "board-list";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface LinkEntry {
  id: string;
  url: string;
  label: string;
}

export interface BlockData {
  markdown?: string;
  fileIds?: string[];
  folderPaths?: string[];
  attachmentOrder?: string[];
  url?: string;
  linkLabel?: string;
  links?: LinkEntry[];
  flowchartId?: string;
  flowchartIds?: string[];
  items?: ChecklistItem[];
  boardIds?: string[];
}
export interface Block {
  id: string;
  type: BlockType;
  title: string;
  icon?: string;
  accent?: string;
  collapsed?: boolean;
  data: BlockData;
  children: Block[];
}

export interface Board {
  id: string;
  title: string;
  blocks: Block[];
}

export interface FlowNodeData {
  label: string;
  note?: string;
}

export interface FlowchartDoc {
  id: string;
  name: string;
  nodes: {
    id: string;
    position: { x: number; y: number };
    data: FlowNodeData;
    type?: string;
    style?: Record<string, unknown>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
  }[];
}

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

export type AppTheme = {
  id: string;
  name: string;
  description?: string;
  colors: {
    bgMain: string;          // главный фон
    bgSecondary: string;     // фон сайдбара
    surface: string;         // фон блоков glass-panel
    surfaceHover: string;
    surfaceActive: string;
    border: string;
    borderHover: string;
    text: string;
    textMuted: string;
    textFaint: string;
    accent: string;
    accentHover: string;
  };
  effects?: {
    blur?: string;
    radius?: string;
  }
}

export type LanguageId = "ru" | "en";