import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FolderTree,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  PlayCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import { getKindLabel, formatBytes, isLaunchable } from "../utils/vault";
import type { FileKind, VaultFile } from "../types";
import { FileIcon } from "../components/FileIcon";
import { VaultTree } from "../components/VaultTree";
import { t } from "../i18n";

const ROOT_KEY = "__vault_root__";

const FILTERS: { key: FileKind | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "files.filter.all" },
  { key: "markdown", labelKey: "files.filter.markdown" },
  { key: "pdf", labelKey: "files.filter.pdf" },
  { key: "text", labelKey: "files.filter.text" },
  { key: "flowchart", labelKey: "files.filter.flowchart" },
  { key: "executable", labelKey: "files.filter.executable" },
];

function countFiles(nodes: VaultFile[]): number {
  return nodes.reduce((count, node) => {
    if (node.kind === "folder") {
      return count + countFiles(node.children ?? []);
    }

    return count + 1;
  }, 0);
}

function collectFolderPaths(nodes: VaultFile[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.kind === "folder") {
      paths.push(node.path);
      paths.push(...collectFolderPaths(node.children ?? []));
    }
  }

  return paths;
}

function sortTree(nodes: VaultFile[]): VaultFile[] {
  return [...nodes]
    .sort((a, b) => {
      const aFolder = a.kind === "folder";
      const bFolder = b.kind === "folder";

      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;

      return a.name.localeCompare(b.name, "ru", {
        numeric: true,
        sensitivity: "base",
      });
    })
    .map((node) => {
      if (node.kind !== "folder") return node;

      return {
        ...node,
        children: sortTree(node.children ?? []),
      };
    });
}

function filterTree(
  nodes: VaultFile[],
  filter: FileKind | "all",
  query: string
): VaultFile[] {
  const q = query.trim().toLowerCase();

  function visit(node: VaultFile, folderMatched: boolean): VaultFile | null {
    if (node.kind === "folder") {
      const selfMatched =
        q.length > 0 &&
        (node.name.toLowerCase().includes(q) ||
          node.path.toLowerCase().includes(q));

      const children = (node.children ?? [])
        .map((child) => visit(child, folderMatched || selfMatched))
        .filter((child): child is VaultFile => Boolean(child));

      if (children.length === 0) return null;

      return {
        ...node,
        children,
      };
    }

    const matchesFilter = filter === "all" || node.kind === filter;

    const matchesQuery =
      q.length === 0 ||
      folderMatched ||
      node.name.toLowerCase().includes(q) ||
      node.path.toLowerCase().includes(q);

    return matchesFilter && matchesQuery ? node : null;
  }

  return nodes
    .map((node) => visit(node, false))
    .filter((node): node is VaultFile => Boolean(node));
}

/* ---------------------- Файл-чип ---------------------- */

function FileChip({ file }: { file: VaultFile }) {
  const navigate = useDashboardStore((s) => s.navigate);
  const launchProgram = useDashboardStore((s) => s.launchProgram);
  const revealInExplorer = useDashboardStore((s) => s.revealInExplorer);
  const openInObsidian = useDashboardStore((s) => s.openInObsidian);
  const deleteFile = useDashboardStore((s) => s.deleteFile);
  const language = useDashboardStore((s) => s.language);
  const launchable = isLaunchable(file);

  /*
   * Позиция контекстного меню. null — меню закрыто.
   */
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике в любое другое место
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

  // Закрытие меню при прокрутке и изменении размера окна
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

  function open() {
    if (launchable) {
      launchProgram(file);
      return;
    }

    if (file.kind === "flowchart") {
      navigate({ name: "flowchart", path: file.path });
      return;
    }

  
    navigate({ name: "file", path: file.path });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      t("files.deleteConfirm", language, { name: file.name })
    );

    if (!confirmed) return;

    await deleteFile(file.path);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();

    const MENU_WIDTH = 176;
    const MENU_HEIGHT = 190;
    const GAP = 8;

    let x = e.clientX;
    let y = e.clientY;

    if (x + MENU_WIDTH > window.innerWidth - GAP) {
      x = window.innerWidth - MENU_WIDTH - GAP;
    }

    if (y + MENU_HEIGHT > window.innerHeight - GAP) {
      y = e.clientY - MENU_HEIGHT;
    }

    if (y < GAP) {
      y = GAP;
    }

    setMenuPos({ x, y });
  }

  const closeMenu = () => setMenuPos(null);

  return (
    <div
      onContextMenu={handleContextMenu}
      className="group inline-flex w-fit max-w-full cursor-context-menu items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.03] py-1 pl-2 pr-2 transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
      title={`${file.name} · ${getKindLabel(file.kind, language)} · ${formatBytes(file.size, language)}\n${t("files.rightClickHint", language)}`}
    >
      <FileIcon kind={file.kind} className="h-3.5 w-3.5 shrink-0" />

      <button
        type="button"
        onClick={open}
        className="max-w-[320px] truncate text-xs text-slate-200 hover:text-cyan-300"
      >
        {file.name}
      </button>

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
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ---------------------- Дети папки ---------------------- */

function TreeChildren({
  nodes,
  depth,
  expanded,
  toggleFolder,
}: {
  nodes: VaultFile[];
  depth: number;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const folders = nodes.filter((node) => node.kind === "folder");
  const files = nodes.filter((node) => node.kind !== "folder");

  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <FolderBranch
          key={folder.id}
          folder={folder}
          depth={depth}
          expanded={expanded}
          toggleFolder={toggleFolder}
        />
      ))}

      {files.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 py-1.5"
          style={{ paddingLeft: depth * 18 + 28 }}
        >
          {files.map((file) => (
            <FileChip key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Папка ---------------------- */

function FolderBranch({
  folder,
  depth,
  expanded,
  toggleFolder,
}: {
  folder: VaultFile;
  depth: number;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isExpanded = expanded.has(folder.path);
  const fileCount = countFiles(folder.children ?? []);

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleFolder(folder.path)}
        className="flex w-fit max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition hover:bg-white/5"
        style={{ marginLeft: depth * 18 }}
        title={folder.path}
      >
        {isExpanded ? (
          <ChevronDown size={13} className="shrink-0 text-slate-500" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-slate-500" />
        )}

        {isExpanded ? (
          <FolderOpen size={14} className="shrink-0 text-cyan-300" />
        ) : (
          <Folder size={14} className="shrink-0 text-cyan-400/80" />
        )}

        <span className="truncate text-xs font-semibold text-slate-200">
          {folder.name}
        </span>

        <span className="shrink-0 text-[10px] text-slate-500">
          · {fileCount}
        </span>
      </button>

      {isExpanded && (
        <TreeChildren
          nodes={folder.children ?? []}
          depth={depth + 1}
          expanded={expanded}
          toggleFolder={toggleFolder}
        />
      )}
    </div>
  );
}

/* ---------------------- Страница ---------------------- */

export default function FilesPage() {
  const vault = useDashboardStore((s) => s.vault);
  const language = useDashboardStore((s) => s.language);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileKind | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([ROOT_KEY])
  );

  const filteredTree = useMemo(() => {
    return sortTree(filterTree(vault, filter, query));
  }, [vault, filter, query]);

  const totalCount = useMemo(() => {
    return countFiles(filteredTree);
  }, [filteredTree]);

  useEffect(() => {
    if (query.trim() || filter !== "all") {
      setExpanded(new Set([ROOT_KEY, ...collectFolderPaths(filteredTree)]));
    }
  }, [query, filter, filteredTree]);

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set([ROOT_KEY, ...collectFolderPaths(filteredTree)]));
  }

  function collapseAll() {
    setExpanded(new Set([ROOT_KEY]));
  }

  const rootExpanded = expanded.has(ROOT_KEY);

  return (
    <div className="mx-auto flex h-full max-w-[1400px] gap-5 px-6 py-6">
      <div className="glass-panel hidden w-72 shrink-0 overflow-y-auto rounded-xl p-3 lg:block">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <FolderTree size={12} /> {t("files.tree", language)}
        </p>

        <VaultTree files={vault} />
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
            <FolderTree size={18} className="text-cyan-300" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              {t("files.title", language)}
            </h1>
            <p className="text-xs text-slate-500">
              {t("files.found", language, { count: totalCount })}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5">
            <Search size={13} className="text-slate-500" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("files.search", language)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none"
            />
          </div>

          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-[11px] transition ${
                filter === f.key
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              {t(f.labelKey, language)}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-slate-400 hover:border-cyan-400/30 hover:text-cyan-300"
            >
              {t("files.expandAll", language)}
            </button>

            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-slate-400 hover:border-white/20 hover:text-slate-200"
            >
              {t("files.collapseAll", language)}
            </button>
          </div>
        </div>

        <div className="space-y-1 pb-8">
          <button
            type="button"
            onClick={() => toggleFolder(ROOT_KEY)}
            className="flex w-fit max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition hover:bg-white/5"
          >
            {rootExpanded ? (
              <ChevronDown size={13} className="shrink-0 text-slate-500" />
            ) : (
              <ChevronRight size={13} className="shrink-0 text-slate-500" />
            )}

            {rootExpanded ? (
              <FolderOpen size={14} className="shrink-0 text-cyan-300" />
            ) : (
              <Folder size={14} className="shrink-0 text-cyan-400/80" />
            )}

            <span className="truncate text-xs font-semibold text-slate-200">
              {t("files.root", language)}
            </span>

            <span className="shrink-0 text-[10px] text-slate-500">
              · {totalCount}
            </span>
          </button>

          {rootExpanded && (
            <TreeChildren
              nodes={filteredTree}
              depth={0}
              expanded={expanded}
              toggleFolder={toggleFolder}
            />
          )}

          {totalCount === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-slate-500">
              {t("files.noResults", language)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}