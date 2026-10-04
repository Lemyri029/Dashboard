import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  StickyNote,
  ListTree,
  Network,
  Link2,
  ListChecks,
  LayoutList,
  Plus,
} from "lucide-react";
import type { BlockType } from "../../types";
import { cn } from "../../utils/cn";

const MENU_WIDTH = 224;
const VIEWPORT_GAP = 8;

export const BLOCK_TYPE_OPTIONS: {
  type: BlockType;
  label: string;
  icon: typeof Boxes;
}[] = [
  { type: "group", label: "Группа", icon: Boxes },
  { type: "note", label: "Заметка", icon: StickyNote },
  { type: "file-list", label: "Файлы", icon: ListTree },
  { type: "board-list", label: "Список", icon: LayoutList },
  { type: "flowchart", label: "Доска", icon: Network },
  { type: "checklist", label: "Чек-лист", icon: ListChecks },
  { type: "link", label: "Ссылка", icon: Link2 },
];

function BlockMenuOptions({
  onSelect,
}: {
  onSelect: (type: BlockType) => void;
}) {
  return (
    <>
      {BLOCK_TYPE_OPTIONS.map((opt) => (
        <button
          type="button"
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          className="nd-menu-option relative flex w-full items-center justify-center rounded-md px-8 py-2 text-center transition"
        >
          <opt.icon
            size={15}
            className="nd-icon-accent absolute left-3 shrink-0"
          />

          <span className="nd-menu-item truncate text-sm font-medium">
            {opt.label}
          </span>
        </button>
      ))}
    </>
  );
}

/**
 * Обычная кнопка «+ Блок».
 * Она продолжает использоваться внутри существующих карточек.
 */
export function AddBlockMenu({
  onAdd,
  compact,
}: {
  onAdd: (type: BlockType) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();

      const left = Math.min(
        Math.max(VIEWPORT_GAP, rect.left),
        window.innerWidth - MENU_WIDTH - VIEWPORT_GAP
      );

      setPos({
        top: rect.bottom + 6,
        left,
      });
    }

    setOpen((current) => !current);
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
          className={cn(
  "nd-btn-add-button inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80",
  compact && "px-2 py-1"
)}
      >
        <Plus className="nd-icon-accent" size={13} />
        Блок
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 150,
              width: MENU_WIDTH,
            }}
            className="glass-panel glow-border rounded-lg p-1.5"
          >
            <BlockMenuOptions
              onSelect={(type) => {
                onAdd(type);
                setOpen(false);
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Контекстное меню рабочего пространства.
 * Открывается в координатах нажатия правой кнопки мыши.
 */
export function AddBlockContextMenu({
  open,
  x,
  y,
  onAdd,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  onAdd: (type: BlockType) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({
    top: y,
    left: x,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const menuHeight =
      menuRef.current?.getBoundingClientRect().height ?? 0;

    const maxLeft = Math.max(
      VIEWPORT_GAP,
      window.innerWidth - MENU_WIDTH - VIEWPORT_GAP
    );

    const maxTop = Math.max(
      VIEWPORT_GAP,
      window.innerHeight - menuHeight - VIEWPORT_GAP
    );

    setPos({
      left: Math.min(Math.max(VIEWPORT_GAP, x), maxLeft),
      top: Math.min(Math.max(VIEWPORT_GAP, y), maxTop),
    });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;

    function onDocumentMouseDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 150,
        width: MENU_WIDTH,
      }}
      className="glass-panel glow-border rounded-lg p-1.5"
    >
      <BlockMenuOptions
        onSelect={(type) => {
          onAdd(type);
          onClose();
        }}
      />
    </div>,
    document.body
  );
}