import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Search } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import { flattenFiles } from "../../utils/vault";
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
      // Но toggleMenu вызывается только от кнопки, а кнопки нет в этом режиме
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

  return (
    <>
      {/* Большая кнопка снизу — только если режим не управляемый */}
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
    </>
  );
}