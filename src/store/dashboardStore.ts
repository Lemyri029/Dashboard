import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { App } from "obsidian";
import type {
  Block,
   BlockGridPosition,
  BlockType,
  Board,
  FlowchartDoc,
  ToastItem,
  ToastKind,
  VaultFile,
  BackgroundSettings,
} from "../types";
import { DEFAULT_BACKGROUND } from "../types";
import { DEFAULT_THEME, type ThemeId, type DashboardTheme } from "../utils/themes";
import { loadCustomThemes } from "../utils/themeLoader";
import { buildVaultTree, readFileContent, writeFileContent } from "../adapters/vaultAdapter";
import { obsidianStorage } from "../adapters/persistAdapter";
import { t, DEFAULT_LANGUAGE, type LanguageId } from "../i18n";

export function getBlockLabel(type: BlockType, lang?: LanguageId): string {
  const language = lang ?? useDashboardStore.getState().language;
  return t("block." + type, language);
}

const BLOCK_LABELS = new Proxy({} as Record<BlockType, string>, {
  get(_target, prop: string) {
    return getBlockLabel(prop as BlockType);
  },
});

export { BLOCK_LABELS };

/* ---------- Настройки текста ---------- */

export type TypographyGroup = {
  fontSize: number;
  fontWeight: number;
};

export type TypographySettings = {
  sidebar: TypographyGroup;
  dashboard: TypographyGroup;
  blockTitle: TypographyGroup;
  blockContent: TypographyGroup;
};

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  sidebar: { fontSize: 13, fontWeight: 500 },
  dashboard: { fontSize: 14, fontWeight: 400 },
  blockTitle: { fontSize: 14, fontWeight: 600 },
  blockContent: { fontSize: 12, fontWeight: 400 },
};

export type DashboardBackupData = {
  blocks: Block[];
  boards: Record<string, Board>;
  background: BackgroundSettings;
  theme: ThemeId;
  customLogo: string | null;
  typography: TypographySettings;
};

export type DashboardBackupFile = {
  app: "Lemo";
  version: number;
  createdAt: string;
  data: DashboardBackupData;
};

const DASHBOARD_BACKUP_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeDashboardBackupFileName(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return "Lemo-backup-" + stamp + ".json";
}

function parseTypographyGroup(value: unknown, fallback: TypographyGroup): TypographyGroup {
  if (!isRecord(value)) return fallback;
  return {
    fontSize: typeof value.fontSize === "number" ? value.fontSize : fallback.fontSize,
    fontWeight: typeof value.fontWeight === "number" ? value.fontWeight : fallback.fontWeight,
  };
}

function parseTypography(value: unknown): TypographySettings {
  if (!isRecord(value)) return DEFAULT_TYPOGRAPHY;
   return {
    sidebar: parseTypographyGroup(value.sidebar, DEFAULT_TYPOGRAPHY.sidebar),
    dashboard: parseTypographyGroup(value.dashboard, DEFAULT_TYPOGRAPHY.dashboard),
    blockTitle: parseTypographyGroup(value.blockTitle, DEFAULT_TYPOGRAPHY.blockTitle),
    blockContent: parseTypographyGroup(value.blockContent, DEFAULT_TYPOGRAPHY.blockContent),
  };
}

function parseDashboardBackup(input: unknown): DashboardBackupData | null {
  if (!isRecord(input)) return null;

  const maybeData = input.app === "Lemo" ? input.data : input;

  if (!isRecord(maybeData)) return null;
  if (!Array.isArray(maybeData.blocks)) return null;
  if (!isRecord(maybeData.boards)) return null;

  const background = isRecord(maybeData.background)
    ? ({ ...DEFAULT_BACKGROUND, ...maybeData.background } as BackgroundSettings)
    : DEFAULT_BACKGROUND;

  const theme =
    typeof maybeData.theme === "string" ? (maybeData.theme as ThemeId) : DEFAULT_THEME;

  const customLogo = typeof maybeData.customLogo === "string" ? maybeData.customLogo : null;

    return {
    blocks: maybeData.blocks as Block[],
    boards: maybeData.boards as Record<string, Board>,
    background,
    theme,
    customLogo,
    typography: parseTypography(maybeData.typography),
  };
}

export type Page =
  | { name: "dashboard" }
  | { name: "file"; path: string }
  | { name: "flowchart"; path: string }
  | { name: "board"; boardId: string }
  | { name: "files" }
  | { name: "settings" };

function makeBlock(type: BlockType, lang: LanguageId, title?: string): Block {
  const base: Block = {
    id: uuid(),
    type,
    title: title ?? getBlockLabel(type, lang),
    accent: "cyan",
    data: {},
    children: [],
  };
  if (type === "note") base.data.markdown = t("store.newNote", lang);
  if (type === "checklist") base.data.items = [];
  if (type === "file-list") base.data.fileIds = [];
  if (type === "board-list") base.data.boardIds = [];
  if (type === "link") base.data.links = [];
  return base;
}

function mapTree(blocks: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (b.children.length) return { ...b, children: mapTree(b.children, id, fn) };
    return b;
  });
}

function insertChild(blocks: Block[], parentId: string | null, child: Block): Block[] {
  if (parentId === null) return [...blocks, child];
  return blocks.map((b) => {
    if (b.id === parentId) return { ...b, children: [...b.children, child] };
    if (b.children.length) return { ...b, children: insertChild(b.children, parentId, child) };
    return b;
  });
}

function removeFromTree(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.children.length ? { ...b, children: removeFromTree(b.children, id) } : b));
}

function detachFromTree(
  blocks: Block[],
  id: string
): { blocks: Block[]; detached: Block | null } {
  const directIndex = blocks.findIndex((block) => block.id === id);

  if (directIndex !== -1) {
    const detached = blocks[directIndex];

    return {
      blocks: blocks.filter((_, index) => index !== directIndex),
      detached,
    };
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (block.children.length === 0) {
      continue;
    }

    const result = detachFromTree(block.children, id);

    if (result.detached) {
      const nextBlocks = [...blocks];
      nextBlocks[index] = {
        ...block,
        children: result.blocks,
      };

      return {
        blocks: nextBlocks,
        detached: result.detached,
      };
    }
  }

  return {
    blocks,
    detached: null,
  };
}

function findInTree(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    const found = findInTree(block.children, id);
    if (found) return found;
  }
  return null;
}

function moveBlockInTree(
  blocks: Block[],
  blockId: string,
  targetParentId: string | null
): Block[] {
  const moving = findInTree(blocks, blockId);
  if (!moving) return blocks;

  if (targetParentId !== null) {
    // Нельзя вкладывать блок в самого себя.
    if (targetParentId === blockId) return blocks;
    // Нельзя вкладывать блок в его собственного потомка.
    if (findInTree(moving.children, targetParentId)) return blocks;
    // Целевой блок должен существовать.
    if (!findInTree(blocks, targetParentId)) return blocks;
  }

  const without = removeFromTree(blocks, blockId);

  // При вложении убираем сохранённые координаты сетки.
  const prepared: Block =
    targetParentId === null
      ? moving
      : { ...moving, gridLayouts: undefined };

  return insertChild(without, targetParentId, prepared);
}

function reorderList(
  blocks: Block[],
  activeId: string,
  overId: string
): Block[] {
  const activeIndex = blocks.findIndex((block) => block.id === activeId);
  const overIndex = blocks.findIndex((block) => block.id === overId);

  if (
    activeIndex === -1 ||
    overIndex === -1 ||
    activeIndex === overIndex
  ) {
    return blocks;
  }

  const next = [...blocks];

  // Не вставляем блок между элементами, а меняем два блока местами.
  [next[activeIndex], next[overIndex]] = [
    next[overIndex],
    next[activeIndex],
  ];

  return next;
}

function reorderTree(
  blocks: Block[],
  parentId: string | null,
  activeId: string,
  overId: string
): Block[] {
  // Перестановка корневых блоков.
  if (parentId === null) {
    return reorderList(blocks, activeId, overId);
  }

  // Перестановка дочерних блоков заданного родителя.
  return blocks.map((block) => {
    if (block.id === parentId) {
      return {
        ...block,
        children: reorderList(block.children, activeId, overId),
      };
    }

    if (block.children.length > 0) {
      return {
        ...block,
        children: reorderTree(
          block.children,
          parentId,
          activeId,
          overId
        ),
      };
    }

    return block;
  });
}

function applyRootGridPositions(
  blocks: Block[],
  columns: number,
  positions: Record<string, BlockGridPosition>
): Block[] {
  const layoutKey = String(columns);

  return blocks.map((block) => {
    const position = positions[block.id];

    if (!position) {
      return block;
    }

    const currentPosition = block.gridLayouts?.[layoutKey];

    if (
      currentPosition?.col === position.col &&
      currentPosition?.row === position.row
    ) {
      return block;
    }

    return {
      ...block,
      gridLayouts: {
        ...(block.gridLayouts ?? {}),
        [layoutKey]: {
          col: Math.max(0, Math.floor(position.col)),
          row: Math.max(0, Math.floor(position.row)),
        },
      },
    };
  });
}

interface DashboardState {
  app: App | null;
  setApp: (app: App) => void;
  language: LanguageId;
  setLanguage: (language: LanguageId) => void;
  background: BackgroundSettings;
  setBackground: (patch: Partial<BackgroundSettings>) => void;
  resetBackground: () => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  typography: TypographySettings;
  setTypography: (group: keyof TypographySettings, patch: Partial<TypographyGroup>) => void;
  resetTypography: () => void;
  customThemes: DashboardTheme[];
  themesLoading: boolean;
  reloadThemes: () => Promise<void>;
  blocks: Block[];
  addBlock: (parentId: string | null, type: BlockType, title?: string, boardId?: string) => string;
  removeBlock: (id: string, boardId?: string) => void;
  updateBlock: (id: string, patch: Partial<Block>, boardId?: string) => void;
  updateBlockData: (id: string, patch: Partial<Block["data"]>, boardId?: string) => void;
  toggleCollapse: (id: string, boardId?: string) => void;
    reorderBlocks: (
    parentId: string | null,
    activeId: string,
    overId: string,
    boardId?: string
  ) => void;

  moveBlock: (
  blockId: string,
  targetParentId: string | null,
  boardId?: string
) => void;

    setBlockGridPositions: (
    columns: number,
    positions: Record<string, BlockGridPosition>,
    boardId?: string
  ) => void;
  
  resetDashboard: () => void;
  exportBackup: () => DashboardBackupFile;
  downloadBackup: () => void;
  importBackup: (backup: unknown) => boolean;
  importBackupFromFile: (file: File) => Promise<void>;
  boards: Record<string, Board>;
  createBoard: (title: string) => string;
  renameBoard: (boardId: string, title: string) => void;
  vault: VaultFile[];
  vaultLoaded: boolean;
  refreshVault: () => void;
  deleteFile: (path: string) => Promise<void>;
  fileContents: Record<string, string>;
  loadFileContent: (path: string) => Promise<string>;
  updateFileContent: (path: string, content: string) => Promise<void>;
  flowchartCache: Record<string, FlowchartDoc>;
  loadFlowchart: (path: string) => Promise<FlowchartDoc>;
  saveFlowchart: (path: string, doc: FlowchartDoc) => Promise<void>;
  createFlowchartFile: (name: string) => Promise<string>;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
  clearCustomLogo: () => void;
  toasts: ToastItem[];
  pushToast: (kind: ToastKind, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  page: Page;
  history: Page[];
  navigate: (page: Page) => void;
  goBack: () => void;
  launchProgram: (file: VaultFile) => void;
  revealInExplorer: (file: VaultFile) => void;
  openInObsidian: (file: VaultFile) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      app: null,
setApp: (app) => {
  set({ app });
},

      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),

      background: DEFAULT_BACKGROUND,

      setBackground: (patch) => {
        set((state) => ({
          background: {
            ...state.background,
            ...patch,
          },
        }));
        console.log("[Lemo] Background updated:", get().background);
      },

      resetBackground: () => {
        set({
          background: DEFAULT_BACKGROUND,
        });
        console.log("[Lemo] Background reset");
      },

      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
        typography: DEFAULT_TYPOGRAPHY,

      setTypography: (group, patch) =>
        set((s) => ({
          typography: {
            ...s.typography,
            [group]: { ...s.typography[group], ...patch },
          },
        })),

      resetTypography: () => set({ typography: DEFAULT_TYPOGRAPHY }),

      customThemes: [],
      themesLoading: false,

      reloadThemes: async () => {
        const app = get().app;
        if (!app) return;
        set({ themesLoading: true });
        try {
          const list = await loadCustomThemes(app);
          set({ customThemes: list, themesLoading: false });
          console.log("[Lemo] Themes loaded:", list.map((item) => item.id));
        } catch (e) {
          set({ themesLoading: false });
          console.warn("[Lemo] Themes error", e);
        }
      },

      blocks: [],

      addBlock: (parentId, type, title, boardId) => {
        const lang = get().language;
        const block = makeBlock(type, lang, title);
        if (!boardId) {
          set((s) => ({ blocks: insertChild(s.blocks, parentId, block) }));
        } else {
          set((s) => ({
            boards: {
              ...s.boards,
              [boardId]: {
                ...s.boards[boardId],
                blocks: insertChild(s.boards[boardId]?.blocks ?? [], parentId, block),
              },
            },
          }));
        }
        get().pushToast(
          "success",
          t("store.blockAdded.title", lang),
          t("store.blockAdded.message", lang, { type: getBlockLabel(type, lang) })
        );
        return block.id;
      },

      removeBlock: (id, boardId) => {
  if (!boardId) {
    set((state) => {
      const result = detachFromTree(state.blocks, id);

      if (!result.detached) {
        return state;
      }

      // Дети удаляемого блока становятся корневыми блоками дашборда.
      return {
        blocks: [
          ...result.blocks,
          ...result.detached.children,
        ],
      };
    });

    return;
  }

  set((state) => {
    const board = state.boards[boardId];

    if (!board) {
      return state;
    }

    const result = detachFromTree(board.blocks, id);

    if (!result.detached) {
      return state;
    }

    // Дети удаляемого блока становятся корневыми
    // внутри текущей доски.
    return {
      boards: {
        ...state.boards,
        [boardId]: {
          ...board,
          blocks: [
            ...result.blocks,
            ...result.detached.children,
          ],
        },
      },
    };
  });
},

      updateBlock: (id, patch, boardId) => {
        if (!boardId) {
          set((s) => ({ blocks: mapTree(s.blocks, id, (b) => ({ ...b, ...patch })) }));
        } else {
          set((s) => ({
            boards: {
              ...s.boards,
              [boardId]: {
                ...s.boards[boardId],
                blocks: mapTree(s.boards[boardId]?.blocks ?? [], id, (b) => ({ ...b, ...patch })),
              },
            },
          }));
        }
      },

      updateBlockData: (id, patch, boardId) => {
        if (!boardId) {
          set((s) => ({
            blocks: mapTree(s.blocks, id, (b) => ({ ...b, data: { ...b.data, ...patch } })),
          }));
        } else {
          set((s) => ({
            boards: {
              ...s.boards,
              [boardId]: {
                ...s.boards[boardId],
                blocks: mapTree(s.boards[boardId]?.blocks ?? [], id, (b) => ({
                  ...b,
                  data: { ...b.data, ...patch },
                })),
              },
            },
          }));
        }
      },

      toggleCollapse: (id, boardId) => {
        if (!boardId) {
          set((s) => ({
            blocks: mapTree(s.blocks, id, (b) => ({ ...b, collapsed: !b.collapsed })),
          }));
        } else {
          set((s) => ({
            boards: {
              ...s.boards,
              [boardId]: {
                ...s.boards[boardId],
                blocks: mapTree(s.boards[boardId]?.blocks ?? [], id, (b) => ({
                  ...b,
                  collapsed: !b.collapsed,
                })),
              },
            },
          }));
        }
      },

      reorderBlocks: (parentId, activeId, overId, boardId) => {
        if (activeId === overId) return;

        if (!boardId) {
          set((state) => ({
            blocks: reorderTree(
              state.blocks,
              parentId,
              activeId,
              overId
            ),
          }));
          return;
        }

        set((state) => ({
          boards: {
            ...state.boards,
            [boardId]: {
              ...state.boards[boardId],
              blocks: reorderTree(
                state.boards[boardId]?.blocks ?? [],
                parentId,
                activeId,
                overId
              ),
            },
          },
        }));
      },

            moveBlock: (blockId, targetParentId, boardId) => {
        if (blockId === targetParentId) return;

        if (!boardId) {
          set((state) => ({
            blocks: moveBlockInTree(state.blocks, blockId, targetParentId),
          }));
          return;
        }

        set((state) => {
          const board = state.boards[boardId];
          if (!board) return state;
          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                blocks: moveBlockInTree(board.blocks, blockId, targetParentId),
              },
            },
          };
        });
      },

      setBlockGridPositions: (columns, positions, boardId) => {
        if (columns < 1) return;

        if (!boardId) {
          set((state) => ({
            blocks: applyRootGridPositions(
              state.blocks,
              columns,
              positions
            ),
          }));

          return;
        }

        set((state) => {
          const board = state.boards[boardId];

          if (!board) {
            return state;
          }

          return {
            boards: {
              ...state.boards,
              [boardId]: {
                ...board,
                blocks: applyRootGridPositions(
                  board.blocks,
                  columns,
                  positions
                ),
              },
            },
          };
        });
      },

      resetDashboard: () => {
        const lang = get().language;
        set({ blocks: [] });
        get().pushToast(
          "info",
          t("store.dashboardReset.title", lang),
          t("store.dashboardReset.message", lang)
        );
      },

      exportBackup: () => {
        const state = get();
        return {
          app: "Lemo",
          version: DASHBOARD_BACKUP_VERSION,
          createdAt: new Date().toISOString(),
           data: {
            blocks: state.blocks,
            boards: state.boards,
            background: state.background,
            theme: state.theme,
            customLogo: state.customLogo,
            typography: state.typography,
          },
        };
      },

      downloadBackup: () => {
        const lang = get().language;
        try {
          const backup = get().exportBackup();
          const json = JSON.stringify(backup, null, 2);
          const blob = new Blob([json], {
            type: "application/json;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = makeDashboardBackupFileName();
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          get().pushToast("success", t("store.backupCreated", lang), link.download);
        } catch (error) {
          get().pushToast(
            "error",
            t("store.backupCreateFailed", lang),
            error instanceof Error ? error.message : String(error)
          );
        }
      },

      importBackup: (backup) => {
        const lang = get().language;
        const data = parseDashboardBackup(backup);

        if (!data) {
          get().pushToast(
            "error",
            t("store.backupInvalid.title", lang),
            t("store.backupInvalid.message", lang)
          );
          return false;
        }

        set({
          blocks: data.blocks,
          boards: data.boards,
          background: data.background,
          theme: data.theme,
          customLogo: data.customLogo,
          typography: data.typography,
          page: { name: "dashboard" },
          history: [],
        });

        get().pushToast(
          "success",
          t("store.backupRestored.title", lang),
          t("store.backupRestored.message", lang)
        );

        return true;
      },

      importBackupFromFile: async (file) => {
        const lang = get().language;
        try {
          const text = await file.text();
          const backup = JSON.parse(text);
          get().importBackup(backup);
        } catch (error) {
          get().pushToast(
            "error",
            t("store.backupLoadFailed", lang),
            error instanceof Error ? error.message : String(error)
          );
        }
      },

      boards: {},

      createBoard: (title) => {
        const id = uuid();
        const board: Board = {
          id,
          title: title.trim() || t("store.untitled", get().language),
          blocks: [],
        };
        set((s) => ({ boards: { ...s.boards, [id]: board } }));
        return id;
      },

      renameBoard: (boardId, title) => {
        set((s) => ({
          boards: {
            ...s.boards,
            [boardId]: {
              ...s.boards[boardId],
              title: title || t("store.untitled", get().language),
            },
          },
        }));
      },

      vault: [],
      vaultLoaded: false,

      refreshVault: () => {
        const app = get().app;
        if (!app) return;
        set({ vault: buildVaultTree(app), vaultLoaded: true });
      },

      deleteFile: async (path) => {
        const lang = get().language;
        const app = get().app;

        if (!app) {
          get().pushToast(
            "error",
            t("store.deleteError", lang),
            t("store.obsidianNotConnected", lang)
          );
          return;
        }

        const target = app.vault.getAbstractFileByPath(path);

        if (!target) {
          get().pushToast("error", t("store.fileNotFound", lang), path);
          return;
        }

        const fileName = target.name;

        try {
          const trashFile = (app.fileManager as any)?.trashFile;

          if (typeof trashFile === "function") {
            await trashFile.call(app.fileManager, target);
          } else {
            await app.vault.trash(target, true);
          }

          set((state) => {
            const fileContents = { ...state.fileContents };
            const flowchartCache = { ...state.flowchartCache };
            delete fileContents[path];
            delete flowchartCache[path];
            return { fileContents, flowchartCache };
          });

          get().refreshVault();
          get().pushToast("success", t("store.fileDeleted", lang), fileName);
        } catch (error) {
          get().pushToast(
            "error",
            t("store.fileDeleteFailed", lang),
            error instanceof Error ? error.message : String(error)
          );
        }
      },

      fileContents: {},

      loadFileContent: async (path) => {
        const cached = get().fileContents[path];
        if (cached !== undefined) return cached;
        const app = get().app;
        if (!app) return "";
        const content = await readFileContent(app, path);
        set((s) => ({ fileContents: { ...s.fileContents, [path]: content } }));
        return content;
      },

      updateFileContent: async (path, content) => {
        const app = get().app;
        if (!app) return;
        await writeFileContent(app, path, content);
        set((s) => ({ fileContents: { ...s.fileContents, [path]: content } }));
        get().refreshVault();
      },

      flowchartCache: {},

      loadFlowchart: async (path) => {
        const cached = get().flowchartCache[path];
        if (cached) return cached;
        const content = await get().loadFileContent(path);
        let doc: FlowchartDoc;
        try {
          doc = content ? JSON.parse(content) : { id: path, name: path, nodes: [], edges: [] };
        } catch {
          doc = { id: path, name: path, nodes: [], edges: [] };
        }
        set((s) => ({ flowchartCache: { ...s.flowchartCache, [path]: doc } }));
        return doc;
      },

      saveFlowchart: async (path, doc) => {
        await get().updateFileContent(path, JSON.stringify(doc, null, 2));
        set((s) => ({ flowchartCache: { ...s.flowchartCache, [path]: doc } }));
      },

      createFlowchartFile: async (name) => {
        const lang = get().language;
        const app = get().app;
        if (!app) return "";
        let fileName = name.trim() || t("store.newFlowchart", lang);
        if (!fileName.toLowerCase().endsWith(".flow")) fileName += ".flow";
        const existing = app.vault.getAbstractFileByPath(fileName);
        if (existing) {
          get().pushToast("warning", t("store.fileExists", lang), fileName);
          return fileName;
        }
        const doc: FlowchartDoc = { id: fileName, name: fileName, nodes: [], edges: [] };
        await writeFileContent(app, fileName, JSON.stringify(doc, null, 2));
        set((s) => ({ flowchartCache: { ...s.flowchartCache, [fileName]: doc } }));
        get().refreshVault();
        get().pushToast("success", t("store.flowchartCreated", lang), fileName);
        return fileName;
      },

      customLogo: null,
      setCustomLogo: (logo) => set({ customLogo: logo }),
      clearCustomLogo: () => set({ customLogo: null }),

      toasts: [],

      pushToast: (kind, title, message) => {
        const item: ToastItem = { id: uuid(), kind, title, message };
        set((s) => ({ toasts: [...s.toasts, item] }));
        setTimeout(() => get().dismissToast(item.id), 4500);
      },

      dismissToast: (id) => {
        set((s) => ({ toasts: s.toasts.filter((item) => item.id !== id) }));
      },

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      page: { name: "dashboard" },
      history: [],

      navigate: (page) => {
        set((s) => ({ history: [...s.history, s.page], page }));
      },

      goBack: () => {
        set((s) => {
          const prev = s.history[s.history.length - 1];
          return {
            page: prev ?? { name: "dashboard" },
            history: s.history.slice(0, -1),
          };
        });
      },

      launchProgram: (file) => {
        const lang = get().language;
        const app = get().app;

        if (!app) {
          get().pushToast(
            "error",
            t("store.launchError", lang),
            t("store.obsidianNotConnectedShort", lang)
          );
          return;
        }

        try {
          const adapter = (app.vault as any).adapter;
          const fullPath = adapter?.getFullPath?.(file.path) ?? file.path;
          const electron = (window as any).require?.("electron");
          const shell = electron?.shell;

          if (!shell?.openPath) {
            get().pushToast(
              "warning",
              t("store.unavailable", lang),
              t("store.launchDesktopOnly", lang)
            );
            return;
          }

          const result = shell.openPath(fullPath);

          if (result && typeof result.then === "function") {
            result
              .then((err: string) => {
                if (err) {
                  get().pushToast("error", t("store.launchFailed", lang), err);
                } else {
                  get().pushToast(
                    "success",
                    t("store.launching", lang, { name: file.name }),
                    fullPath
                  );
                }
              })
              .catch((e: Error) => {
                get().pushToast("error", t("store.launchError", lang), e.message);
              });
          } else {
            get().pushToast(
              "success",
              t("store.launching", lang, { name: file.name }),
              fullPath
            );
          }
        } catch (e) {
          get().pushToast("error", t("store.launchError", lang), String(e));
        }
      },

      revealInExplorer: (file) => {
        const lang = get().language;
        const app = get().app;

        if (!app) {
          get().pushToast(
            "error",
            t("store.explorerFailed", lang),
            t("store.obsidianNotConnected", lang)
          );
          return;
        }

        try {
          const adapter = app.vault.adapter as any;
          const fullPath = adapter.getFullPath?.(file.path);

          if (!fullPath) {
            get().pushToast(
              "warning",
              t("store.featureUnavailable", lang),
              t("store.explorerDesktopOnly", lang)
            );
            return;
          }

          const electron = (window as any).require?.("electron");
          const shell = electron?.shell;

          if (shell?.showItemInFolder) {
            shell.showItemInFolder(fullPath);
            return;
          }

          if (shell?.openPath) {
            const pathModule = (window as any).require?.("path");
            const folderPath =
              pathModule?.dirname?.(fullPath) ?? fullPath.replace(/[\\/][^\\/]+$/, "");
            void shell.openPath(folderPath);
            return;
          }

          get().pushToast(
            "warning",
            t("store.featureUnavailable", lang),
            t("store.explorerDesktopOnly", lang)
          );
        } catch (error) {
          get().pushToast(
            "error",
            t("store.explorerFailed", lang),
            error instanceof Error ? error.message : String(error)
          );
        }
      },

      openInObsidian: (file) => {
        const app = get().app;
        app?.workspace.openLinkText(file.path, "", true);
        get().pushToast("success", t("store.openedInObsidian", get().language), file.name);
      },
    }),
    {
      name: "Lemo-store",
      storage: createJSONStorage(() => obsidianStorage),
      skipHydration: true,
       partialize: (s) => ({
        blocks: s.blocks,
        boards: s.boards,
        background: s.background,
        theme: s.theme,
        customLogo: s.customLogo,
        language: s.language,
        typography: s.typography,
      }),

            merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DashboardState>;
        return {
          ...current,
          ...p,
          typography: {
            sidebar: { ...DEFAULT_TYPOGRAPHY.sidebar, ...p.typography?.sidebar },
            dashboard: { ...DEFAULT_TYPOGRAPHY.dashboard, ...p.typography?.dashboard },
            blockTitle: { ...DEFAULT_TYPOGRAPHY.blockTitle, ...p.typography?.blockTitle },
            blockContent: { ...DEFAULT_TYPOGRAPHY.blockContent, ...p.typography?.blockContent },
          },
        };
      },

    }
  )
);