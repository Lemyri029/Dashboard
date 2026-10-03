import { Folder, FolderOpen, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

declare global {
  interface Window {
    require?: (name: string) => any;
  }
}

function basename(path: string) {
  const clean = path.replace(/[\\/]+$/, "");
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function openFolderInExplorer(path: string) {
  try {
    const electron = window.require?.("electron");
    if (electron?.shell?.openPath) {
      electron.shell.openPath(path);
      return;
    }
    const cp = window.require?.("child_process");
    if (cp?.execFile) {
      cp.execFile("explorer.exe", [path]);
    }
  } catch (e) {
    console.warn("Не удалось открыть папку:", e);
  }
}

interface FolderRowProps {
  path: string;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

export function FolderRow({
  path,
  onRemove,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver = false,
}: FolderRowProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuPos) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPos]);

  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuPos]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const MENU_W = 176;
    const MENU_H = 120;
    const GAP = 8;
    let x = e.clientX;
    let y = e.clientY;
    if (x + MENU_W > window.innerWidth - GAP) x = window.innerWidth - MENU_W - GAP;
    if (y + MENU_H > window.innerHeight - GAP) y = e.clientY - MENU_H;
    if (y < GAP) y = GAP;
    setMenuPos({ x, y });
  }

    return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={handleContextMenu}
      className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition ${
        isDragOver
          ? "border-amber-400/50 bg-amber-400/10"
          : "border-white/5 bg-white/[0.02] hover:border-amber-400/20 hover:bg-white/[0.04]"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Folder size={14} className="h-3.5 w-3.5 shrink-0 text-amber-300/80" />

            <button
        type="button"
        onClick={() => openFolderInExplorer(path)}
        className="min-w-0 flex-1 overflow-hidden text-center"
        title={`Открыть в проводнике: ${path}`}
      >
        <p className="block w-full truncate text-center text-xs text-slate-200">
          {basename(path)}
        </p>
      </button>

      <span className="flex w-[72px] shrink-0 flex-col items-end justify-center leading-tight">
        <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300/80 ring-1 ring-amber-400/20">
          Папка
        </span>
      </span>

      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ left: menuPos.x, top: menuPos.y }}
            className="fixed z-[9999] w-44 rounded-md border border-white/10 bg-[#1e1e1e] p-1 shadow-xl"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  openFolderInExplorer(path);
                  setMenuPos(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-amber-300 hover:bg-amber-400/10"
              >
                <FolderOpen size={14} />
                Открыть в проводнике
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    onRemove();
                    setMenuPos(null);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <X size={14} />
                  Убрать из блока
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}