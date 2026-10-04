import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ExternalLink,
  FolderOpen,
  PlayCircle,
  Trash2,
} from "lucide-react";

import type { VaultFile } from "../types";
import { FileIcon } from "./FileIcon";
import { useDashboardStore, type Page } from "../store/dashboardStore";
import { cn } from "../utils/cn";

/**
 * Файлы, которые можно запустить
 * через системный обработчик Windows/macOS/Linux.
 */
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

function isLaunchable(file: VaultFile): boolean {
  const path = file.path.toLowerCase();

  return (
    file.kind === "executable" ||
    LAUNCHABLE_EXTENSIONS.some((extension) => path.endsWith(extension))
  );
}

/**
 * Открытие файла внутри дашборда.
 */
function openTarget(file: VaultFile, navigate: (page: Page) => void) {
  if (file.kind === "flowchart") {
    navigate({
      name: "flowchart",
      path: file.path,
    });
    return;
  }

  if (file.kind === "hostly") {
    navigate({
      name: "hostly",
      path: file.path,
    });
    return;
  }

  navigate({
    name: "file",
    path: file.path,
  });
}

function TreeNode({
  file,
  depth,
}: {
  file: VaultFile;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);

  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const navigate = useDashboardStore((state) => state.navigate);
  const launchProgram = useDashboardStore((state) => state.launchProgram);
  const revealInExplorer = useDashboardStore(
    (state) => state.revealInExplorer
  );
  const deleteFile = useDashboardStore((state) => state.deleteFile);

  const isFolder = file.kind === "folder";
  const launchable = isLaunchable(file);

  /**
   * Закрытие меню при клике вне него,
   * прокрутке или изменении размера окна.
   */
  useEffect(() => {
    if (!menuPos) return;

    function handleClickOutside(event: globalThis.MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuPos(null);
      }
    }

    function closeMenu() {
      setMenuPos(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuPos]);

  function handleContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    // Для папок оставляем обычное поведение.
    if (isFolder) return;

    event.preventDefault();
    event.stopPropagation();

    const MENU_WIDTH = 180;
    const MENU_HEIGHT = 140;
    const GAP = 8;

    let x = event.clientX;
    let y = event.clientY;

    if (x + MENU_WIDTH > window.innerWidth - GAP) {
      x = window.innerWidth - MENU_WIDTH - GAP;
    }

    if (y + MENU_HEIGHT > window.innerHeight - GAP) {
      y = event.clientY - MENU_HEIGHT;
    }

    if (x < GAP) {
      x = GAP;
    }

    if (y < GAP) {
      y = GAP;
    }

    setMenuPos({ x, y });
  }

  function openFile() {
    if (launchable) {
      launchProgram(file);
      return;
    }

    openTarget(file, navigate);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Удалить файл «${file.name}»?\n\n` +
        "Файл будет перемещён в корзину согласно настройкам Obsidian."
    );

    if (!confirmed) return;

    setMenuPos(null);
    await deleteFile(file.path);
  }

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-300/90 transition-colors hover:bg-white/5"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (isFolder) {
            setOpen((value) => !value);
          } else {
            openFile();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {isFolder ? (
          <ChevronRight
            size={14}
            className={cn(
              "shrink-0 text-slate-500 transition-transform",
              open && "rotate-90"
            )}
          />
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        <FileIcon kind={file.kind} className="h-3.5 w-3.5 shrink-0" />

        <span className="min-w-0 flex-1 truncate">{file.name}</span>
      </div>

      {isFolder && open && file.children && (
        <div>
          {file.children.map((child) => (
            <TreeNode
              key={child.id}
              file={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              left: menuPos.x,
              top: menuPos.y,
            }}
            className="fixed z-[9999] w-44 rounded-md border border-white/10 bg-[#1e1e1e] p-1 shadow-xl"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  openFile();
                  setMenuPos(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                  launchable
                    ? "text-emerald-300 hover:bg-emerald-400/10"
                    : "text-cyan-300 hover:bg-cyan-400/10"
                )}
              >
                {launchable ? (
                  <PlayCircle size={14} />
                ) : (
                  <ExternalLink size={14} />
                )}

                {launchable ? "Запустить" : "Открыть"}
              </button>

              <button
                type="button"
                onClick={() => {
                  revealInExplorer(file);
                  setMenuPos(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <FolderOpen size={14} />
                В проводнике
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function VaultTree({ files }: { files: VaultFile[] }) {
  return (
    <div className="space-y-0.5">
      {files.map((file) => (
        <TreeNode
          key={file.id}
          file={file}
          depth={0}
        />
      ))}
    </div>
  );
}