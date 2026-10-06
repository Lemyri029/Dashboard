import {
  FolderOpen,
  PlayCircle,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { VaultFile } from "../../types";
import { FileIcon } from "../FileIcon";
import { useDashboardStore } from "../../store/dashboardStore";
import { getKindLabel } from "../../utils/vault";
import { t } from "../../i18n";
import { confirmDialog } from "../ConfirmDialog";

/**
 * Расширения файлов, которые можно запускать
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

interface FileRowProps {
  file: VaultFile;
  onRemove?: () => void;
  allowDelete?: boolean;
  hidePath?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

export function FileRow({
  file,
  onRemove,
  allowDelete = false,
  hidePath = true,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver = false,
}: FileRowProps) {
  const navigate = useDashboardStore((state) => state.navigate);
  const launchProgram = useDashboardStore((state) => state.launchProgram);
  const revealInExplorer = useDashboardStore(
    (state) => state.revealInExplorer
  );
  const openInObsidian = useDashboardStore(
    (state) => state.openInObsidian
  );
  const deleteFile = useDashboardStore((state) => state.deleteFile);
  const language = useDashboardStore((state) => state.language);

  /*
   * Позиция контекстного меню в координатах окна.
   * null — меню закрыто.
   */
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике в любое другое место
  useEffect(() => {
    if (!menuPos) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPos(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPos]);

  // Закрываем меню при прокрутке и изменении размера окна
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

  const launchable = isLaunchable(file);

  function open() {
    if (launchable) {
      launchProgram(file);
      return;
    }

    if (file.kind === "flowchart") {
      navigate({
        name: "flowchart",
        path: file.path,
      });
      return;
    }

    navigate({
      name: "file",
      path: file.path,
    });
  }

   async function handleDelete() {
    const confirmed = await confirmDialog({
      title: t("dialog.deleteFileTitle", language),
      message: t("files.deleteConfirm", language, { name: file.name }),
      confirmLabel: t("files.menu.delete", language),
      cancelLabel: t("dialog.cancel", language),
      danger: true,
    });

    if (!confirmed) return;

    await deleteFile(file.path);
  }

  /**
   * Правый клик: запоминаем координаты курсора
   * и открываем меню. Если курсор близко к краям
   * окна — сдвигаем меню, чтобы оно не обрезалось.
   */
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();

    const MENU_WIDTH = 176; // w-44 = 176px
    const MENU_HEIGHT = 220; // примерная высота меню
    const GAP = 8;

    let x = e.clientX;
    let y = e.clientY;

    // Не вылезать за правый край окна
    if (x + MENU_WIDTH > window.innerWidth - GAP) {
      x = window.innerWidth - MENU_WIDTH - GAP;
    }

    // Если внизу не хватает места — открыть меню ВВЕРХ от курсора
    if (y + MENU_HEIGHT > window.innerHeight - GAP) {
      y = e.clientY - MENU_HEIGHT;
    }

    // Страховка от вылезания за верхний край
    if (y < GAP) {
      y = GAP;
    }

    setMenuPos({ x, y });
  }

  const closeMenu = () => setMenuPos(null);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={handleContextMenu}
      className={`group nd-row flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
        isDragOver ? "nd-row--drag" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <FileIcon
        kind={file.kind}
        className="h-3.5 w-3.5 shrink-0"
      />

      {/* Название файла: по центру, обрезается многоточием */}
      <button
        type="button"
        onClick={open}
        className="min-w-0 flex-1 overflow-hidden text-center"
        title={
          launchable
            ? t("files.title.launch", language, { name: file.name })
            : t("files.title.open", language, { name: file.name })
        }
      >
        <p className="nd-row__name block w-full truncate text-center text-xs">
          {file.name}
        </p>

        {!hidePath && (
          <p className="nd-row__faint block w-full truncate text-center font-mono-techno text-[9px]">
            {file.path}
          </p>
        )}
      </button>

      {/* Тип файла */}
      <span className="flex w-[72px] shrink-0 flex-col items-end justify-center leading-tight">
        <span className="nd-row__badge rounded-full px-1.5 py-0.5 text-[9px]">
          {getKindLabel(file.kind, language)}
        </span>
      </span>

      {/*
       * Контекстное меню рендерится через портал
       * прямо в document.body, поэтому границы блока
       * его НЕ обрезают. Позиция — координаты курсора.
       */}
      {menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ left: menuPos.x, top: menuPos.y }}
            className="fixed z-[9999] w-44 rounded-md border border-white/10 bg-[#1e1e1e] p-1 shadow-xl"
          >
            <div className="flex flex-col gap-0.5">
              {launchable ? (
                <button
                  type="button"
                  onClick={() => {
                    launchProgram(file);
                    closeMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-emerald-300 hover:bg-emerald-400/10"
                >
                  <PlayCircle size={14} />
                  {t("files.menu.launch", language)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    open();
                    closeMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-cyan-300 hover:bg-cyan-400/10"
                >
                  <ExternalLink size={14} />
                  {t("files.menu.open", language)}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  revealInExplorer(file);
                  closeMenu();
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <FolderOpen size={14} />
                {t("files.menu.reveal", language)}
              </button>

              {(file.kind === "markdown" || file.kind === "pdf") && (
                <button
                  type="button"
                  onClick={() => {
                    openInObsidian(file);
                    closeMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-violet-300 hover:bg-violet-400/10"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                  {t("files.menu.obsidian", language)}
                </button>
              )}

              {allowDelete && (
                <button
                  type="button"
                  onClick={() => {
                    handleDelete();
                    closeMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <Trash2 size={14} />
                  {t("files.menu.delete", language)}
                </button>
              )}

              {onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    onRemove();
                    closeMenu();
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"
                >
                  <X size={14} />
                  {t("files.menu.remove", language)}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}