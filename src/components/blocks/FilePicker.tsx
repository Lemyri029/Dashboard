import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, ExternalLink, FolderOpen, Trash2, PlayCircle } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { flattenFiles, isLaunchable } from "../../utils/vault";
import { FileIcon } from "../FileIcon";

export function FilePicker({
  excludeIds,
  onPick,
  open,
  onClose,
}: {
  excludeIds: string[];
  onPick: (id: string) => void;
  open?: boolean;
  onClose?: () => void;
}) {
  const vault = useDashboardStore((s) => s.vault);
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;

  const [q, setQ] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({
    top: 80,
    left: Math.max(16, window.innerWidth / 2 - 160),
    width: 320,
  });

  // Контекстное меню для файла
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const all = flattenFiles(vault).filter(
      (f) => f.kind !== "folder" && !excludeIds.includes(f.id)
    );
    if (!q.trim()) return all;
    return all.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  }, [vault, excludeIds, q]);

  // Закрытие по клику вне меню
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        if (isControlled) {
          onClose?.();
        } else {
          setInternalOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isControlled, onClose]);

  // Закрытие контекстного меню при клике вне
  useEffect(() => {
    if (!menuPos) return;

    function handleClickOutside(e: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setMenuPos(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPos]);

  function toggleMenu() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuWidth = 320;
      const left = Math.min(rect.left, window.innerWidth - menuWidth - 16);
      setPos({
        top: rect.bottom + 6,
        left,
        width: menuWidth,
      });
    }
    if (isControlled) {
      // При управлении извне просто открываем/закрываем через родителя
    } else {
      setInternalOpen((o) => !o);
      setQ("");
    }
  }

  function handlePick(id: string) {
    onPick(id);
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
    setQ("");
  }

  // --- Контекстное меню для файла ---
  const navigate = useDashboardStore((state) => state.navigate);
  const launchProgram = useDashboardStore((state) => state.launchProgram);
  const revealInExplorer = useDashboardStore((state) => state.revealInExplorer);
  const deleteFile = useDashboardStore((state) => state.deleteFile);

  function handleContextMenu(e: React.MouseEvent, fileId: string) {
    e.preventDefault();
    e.stopPropagation();

    const MENU_WIDTH = 176;
    const MENU_HEIGHT = 160; // Высота меню
    const GAP = 8;

    let x = e.clientX;
    let y = e.clientY;

    if (x + MENU_WIDTH > window.innerWidth - GAP) {
      x = window.innerWidth - MENU_WIDTH - GAP;
    }
    if (y + MENU_HEIGHT > window.innerHeight - GAP) {
      y = e.clientY - MENU_HEIGHT;
    }
    if (y < GAP) y = GAP;

    setMenuPos({ x, y, fileId });
  }

  function closeFileMenu() {
    setMenuPos(null);
  }

  const currentFile = options.find(f => f.id === menuPos?.fileId);

  async function handleDelete(fileId: string) {
    const file = options.find(f => f.id === fileId);
    if (!file) return;

    const confirmed = window.confirm(
      `Удалить файл «${file.name}»?\n\nФайл будет перемещён в корзину согласно настройкам Obsidian.`
    );
    if (!confirmed) return;

    await deleteFile(file.path);
    closeFileMenu();
  }

  function openFile(file: any) {
    if (isLaunchable(file)) {
      launchProgram(file);
      return;
    }

    if (file.kind === "flowchart") {
      navigate({ name: "flowchart", path: file.path });
      return;
    }

    if (file.kind === "hostly") {
      navigate({ name: "hostly", path: file.path });
      return;
    }

    navigate({ name: "file", path: file.path });
  }

  return (
    <>
      {!isControlled && (
        <button
          ref={btnRef}
          onClick={toggleMenu}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-xs text-slate-400 hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <Plus size={13} /> Добавить файл
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 200,
            }}
            className="glass-panel glow-border max-h-[360px] overflow-hidden rounded-lg"
          >
            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
              <Search size={13} className="text-slate-500" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск файла..."
                className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-1">
              {options.length === 0 && (
                <p className="p-4 text-center text-xs text-slate-500">
                  {q ? "Ничего не найдено" : "Нет доступных файлов"}
                </p>
              )}
              {options.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handlePick(f.id)}
                  onContextMenu={(e) => handleContextMenu(e, f.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                >
                  <FileIcon kind={f.kind} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto truncate text-[10px] text-slate-500">
                    {f.path.split("/").slice(0, -1).join("/")}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Контекстное меню для файла */}
      {menuPos && currentFile &&
        createPortal(
          <div
            ref={fileMenuRef}
            style={{ left: menuPos.x, top: menuPos.y }}
            className="fixed z-[9999] w-44 rounded-md border border-white/10 bg-[#1e1e1e] p-1 shadow-xl"
          >
            <div className="flex flex-col gap-0.5">
              {isLaunchable(currentFile) ? (
                <button
                  type="button"
                  onClick={() => {
                    launchProgram(currentFile);
                    closeFileMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-emerald-300 hover:bg-emerald-400/10"
                >
                  <PlayCircle size={14} />
                  Запустить
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    openFile(currentFile);
                    closeFileMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-cyan-300 hover:bg-cyan-400/10"
                >
                  <ExternalLink size={14} />
                  Открыть
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  revealInExplorer(currentFile);
                  closeFileMenu();
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <FolderOpen size={14} />
                B проводнике
              </button>

              <button
                type="button"
                onClick={() => handleDelete(currentFile.id)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
} 