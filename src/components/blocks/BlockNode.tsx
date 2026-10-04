import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Boxes,
  StickyNote,
  ListTree,
  Network,
  Server,
  Link2,
  ListChecks,
  LayoutList,
  Palette,
  Paperclip,
  FolderOpen,
  Pencil,
  Plus,
} from "lucide-react";
import type { Block, BlockType } from "../../types";
import { useDashboardStore } from "../../store/dashboardStore";
import { accentClasses, ACCENTS } from "../../utils/accent";
import { BLOCK_TYPE_OPTIONS } from "./AddBlockMenu";
import {
  NoteContent,
  ChecklistContent,
  FileListContent,
  LinkContent,
  FlowchartMiniContent,
  HostlyMiniContent,
  BoardListContent,
} from "./BlockContents";
import { cn } from "../../utils/cn";

const MENU_WIDTH = 224;
const VIEWPORT_GAP = 8;

const TYPE_ICON: Record<BlockType, typeof Boxes> = {
  group: Boxes,
  note: StickyNote,
  "file-list": ListTree,
  flowchart: Network,
  hostly: Server,
  link: Link2,
  graph: Network,
  checklist: ListChecks,
  "board-list": LayoutList,
};

const ACCENT_HEX: Record<string, string> = {
  cyan: "#22d3ee",
  violet: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
  emerald: "#34d399",
  slate: "#94a3b8",
};

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

type AccentName = (typeof ACCENTS)[number];

function BlockContextMenu({
  open,
  x,
  y,
  currentAccent,
  onSetAccent,
  onAdd,
  onDelete,
  onAttachFile,
  onAttachFolder,
  onAttachFlowchart,
  onEditNote,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  currentAccent?: string;
  onSetAccent: (accent: AccentName) => void;
  onAdd: (type: BlockType) => void;
  onDelete: () => void;
    onAttachFile?: () => void;
  onAttachFolder?: () => void;
  onAttachFlowchart?: () => void;
  onEditNote?: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const [panel, setPanel] = useState<"colors" | "add" | null>(null);

  const [position, setPosition] = useState({
    top: y,
    left: x,
  });

  useEffect(() => {
    if (!open) {
      setPanel(null);
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;

    const rect = menuRef.current?.getBoundingClientRect();

    const menuHeight = rect?.height ?? 0;
    const menuWidth = rect?.width ?? MENU_WIDTH;

    const maxLeft = Math.max(
      VIEWPORT_GAP,
      window.innerWidth - menuWidth - VIEWPORT_GAP
    );

    const maxTop = Math.max(
      VIEWPORT_GAP,
      window.innerHeight - menuHeight - VIEWPORT_GAP
    );

    const nextPosition = {
      left: Math.min(Math.max(VIEWPORT_GAP, x), maxLeft),
      top: Math.min(Math.max(VIEWPORT_GAP, y), maxTop),
    };

    setPosition((current) => {
      if (
        current.top === nextPosition.top &&
        current.left === nextPosition.left
      ) {
        return current;
      }

      return nextPosition;
    });
  }, [open, x, y, panel]);

  if (!open) {
    return null;
  }

      const hasExtraAction = Boolean(
    onAttachFile || onAttachFolder || onAttachFlowchart || onEditNote
  );

  return createPortal(
    <div
      ref={menuRef}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 200,
        width: MENU_WIDTH,
      }}
      className="glass-panel glow-border rounded-lg p-1.5 shadow-xl"
    >
      {/* Особое действие для блока «Файлы» */}
      {onAttachFile && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onAttachFile();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
        >
          <Paperclip size={15} className="text-cyan-300" />
          Прикрепить файл
        </button>
      )}
      {onAttachFolder && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onAttachFolder();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
        >
          <FolderOpen size={15} className="text-amber-300" />
          Прикрепить папку
        </button>
      )}
            {onAttachFlowchart && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onAttachFlowchart();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
        >
          <Network size={15} className="text-violet-300" />
          Добавить доску
        </button>
      )}
      {/* Особое действие для блока «Заметка» */}
      {onEditNote && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onEditNote();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
        >
          <Pencil size={15} className="text-cyan-300" />
          Редактировать заметку
        </button>
      )}

      {hasExtraAction && (
        <div className="my-1 border-t border-white/10" />
      )}

      {/* Выбор цвета */}
      <button
        type="button"
        onClick={() =>
          setPanel((current) =>
            current === "colors" ? null : "colors"
          )
        }
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
      >
        <Palette size={15} className="text-cyan-300" />

        <span className="flex-1">Цвет блока</span>

        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-white/30"
          style={{
            backgroundColor:
              ACCENT_HEX[currentAccent ?? "cyan"] ?? "#22d3ee",
          }}
        />

        <ChevronRight
          size={14}
          className={cn(
            "text-slate-500 transition-transform",
            panel === "colors" && "rotate-90"
          )}
        />
      </button>

      {panel === "colors" && (
        <div className="mx-2 mb-1.5 flex items-center justify-between rounded-md bg-black/20 px-2 py-2">
          {ACCENTS.map((accent) => (
            <button
              type="button"
              key={accent}
              onClick={() => {
                onSetAccent(accent);
                onClose();
              }}
              style={{
                backgroundColor:
                  ACCENT_HEX[accent] ?? "#22d3ee",
              }}
              className={cn(
                "h-5 w-5 rounded-full ring-1 ring-white/20 transition-transform hover:scale-125",
                currentAccent === accent &&
                  "scale-110 ring-2 ring-white shadow-md"
              )}
              title={accent}
            />
          ))}
        </div>
      )}

      {/* Добавление дочернего блока */}
      <button
        type="button"
        onClick={() =>
          setPanel((current) =>
            current === "add" ? null : "add"
          )
        }
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
      >
        <Plus size={15} className="text-cyan-300" />

        <span className="flex-1">Добавить блок</span>

        <ChevronRight
          size={14}
          className={cn(
            "text-slate-500 transition-transform",
            panel === "add" && "rotate-90"
          )}
        />
      </button>

      {panel === "add" && (
        <div className="mx-1 mb-1 rounded-md border border-white/5 bg-black/15 p-1">
          {BLOCK_TYPE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.type}
              onClick={() => {
                onAdd(option.type);
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              <option.icon
                size={14}
                className="shrink-0 text-cyan-300"
              />

              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="my-1 border-t border-white/10" />

      {/* Удаление */}
      <button
        type="button"
        onClick={() => {
          onClose();
          onDelete();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-400/10"
      >
        <Trash2 size={15} />
        Удалить блок
      </button>
    </div>,
    document.body
  );
}

export function BlockNode({
  block,
  depth = 0,
  boardId,
}: {
  block: Block;
  depth?: number;
  boardId?: string;
}) {
  const toggleCollapse = useDashboardStore((s) => s.toggleCollapse);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const updateBlock = useDashboardStore((s) => s.updateBlock);
  const addBlock = useDashboardStore((s) => s.addBlock);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title);

  const [contextMenu, setContextMenu] =
    useState<ContextMenuState>({
      open: false,
      x: 0,
      y: 0,
    });

  const accent = accentClasses(block.accent);
  const Icon = TYPE_ICON[block.type] ?? Boxes;
  const collapsed = !!block.collapsed;

  function closeContextMenu() {
    setContextMenu((current) => ({
      ...current,
      open: false,
    }));
  }

  function handleHeaderContextMenu(
    event: ReactMouseEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function renderContent() {
    switch (block.type) {
      case "note":
        return <NoteContent block={block} boardId={boardId} />;

      case "checklist":
        return <ChecklistContent block={block} boardId={boardId} />;

      case "file-list":
        return <FileListContent block={block} boardId={boardId} />;

      case "link":
        return <LinkContent block={block} boardId={boardId} />;

      case "flowchart":
        return <FlowchartMiniContent block={block} boardId={boardId} />;

      case "hostly":
        return <HostlyMiniContent block={block} />;

      case "board-list":
        return <BoardListContent block={block} boardId={boardId} />;

      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        "glass-panel relative min-w-0 overflow-hidden rounded-lg ring-1 transition-shadow",
        accent.ring,
        depth === 0 && "shadow-md shadow-black/30"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[1.5px] rounded-t-lg opacity-70",
          accent.dot
        )}
      />

      {/* ШАПКА БЛОКА: ПКМ открывает контекстное меню */}
      <div
        onContextMenu={handleHeaderContextMenu}
        className="flex items-center gap-1.5 px-2.5 py-1.5"
        title="Нажмите ПКМ для меню блока"
      >
        <button
          type="button"
          onClick={() => toggleCollapse(block.id, boardId)}
          className="text-slate-500 hover:text-slate-300"
          title={collapsed ? "Развернуть блок" : "Свернуть блок"}
        >
          {collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>

        <div
          className={cn(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded",
            accent.bg
          )}
        >
          <Icon size={10} className={accent.text} />
        </div>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => {
              updateBlock(
                block.id,
                { title: titleDraft || block.title },
                boardId
              );
              setEditingTitle(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                (event.target as HTMLInputElement).blur();
              }
            }}
            className="flex-1 rounded bg-black/30 px-1 py-0.5 text-xs text-slate-100 focus:outline-none"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 cursor-text truncate text-xs font-semibold text-slate-100"
            title="Двойной клик — переименовать"
          >
            {block.title}
          </h3>
        )}

        <span className="hidden text-[9px] uppercase tracking-wide text-slate-500 sm:inline">
          {block.children.length > 0 &&
            `${block.children.length} вложен.`}
        </span>
      </div>

      {!collapsed && (
        <div className="space-y-2 px-2.5 pb-2.5">
          {renderContent()}

          {block.children.length > 0 && (
  <div className="space-y-1.5 pl-2.5">
    {block.children.map((child) => (
      <BlockNode
        key={child.id}
        block={child}
        depth={depth + 1}
        boardId={boardId}
      />
    ))}
  </div>
)}
        </div>
      )}

            <BlockContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        currentAccent={block.accent}
        onSetAccent={(accent) =>
          updateBlock(block.id, { accent }, boardId)
        }
        onAdd={(type) =>
          addBlock(block.id, type, undefined, boardId)
        }
        onDelete={() => removeBlock(block.id, boardId)}
        onAttachFile={
          block.type === "file-list"
            ? () => {
                window.dispatchEvent(
                  new CustomEvent(`open-file-picker-${block.id}`)
                );
              }
            : undefined
        }
        onAttachFolder={
          block.type === "file-list"
            ? () => {
                window.dispatchEvent(
                  new CustomEvent(`open-folder-picker-${block.id}`)
                );
              }
            : undefined
        }
        onAttachFlowchart={
          block.type === "flowchart"
            ? () => {
                window.dispatchEvent(
                  new CustomEvent(`open-flowchart-picker-${block.id}`)
                );
              }
            : undefined
        }
        onEditNote={
          block.type === "note"
            ? () => {
                window.dispatchEvent(
                  new CustomEvent(`open-note-editor-${block.id}`)
                );
              }
            : undefined
        }
        onClose={closeContextMenu}
      />
    </div>
  );
}