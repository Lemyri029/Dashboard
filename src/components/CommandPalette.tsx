import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import { flattenFiles } from "../utils/vault";
import { FileIcon } from "./FileIcon";

export function CommandPalette() {
  const open = useDashboardStore((s) => s.commandPaletteOpen);
  const setOpen = useDashboardStore((s) => s.setCommandPaletteOpen);
  const vault = useDashboardStore((s) => s.vault);
  const navigate = useDashboardStore((s) => s.navigate);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const files = useMemo(
    () => flattenFiles(vault).filter((f) => f.kind !== "folder"),
    [vault]
  );

  const results = useMemo(() => {
    if (!query.trim()) return files.slice(0, 8);
    const q = query.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)).slice(0, 12);
  }, [files, query]);

  function go(path: string, kind: string) {
    if (kind === "flowchart") navigate({ name: "flowchart", path });
    else if (kind === "hostly") navigate({ name: "hostly", path });
    else navigate({ name: "file", path });
    setOpen(false);
    setQuery("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-28 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel glow-border w-full max-w-lg overflow-hidden rounded-xl"
          >
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <Search size={16} className="text-cyan-300" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск файлов в vault..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">
                ESC
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-500">Ничего не найдено</p>
              )}
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => go(f.path, f.kind)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                >
                  <FileIcon kind={f.kind} className="h-4 w-4" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="truncate font-mono-techno text-[10px] text-slate-500">
                    {f.path}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}