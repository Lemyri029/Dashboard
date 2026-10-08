import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Eye, Plus, Trash2, ExternalLink, X, Copy } from "lucide-react";
import type { Block, LinkEntry } from "../../types";
import { useDashboardStore } from "../../store/dashboardStore";
import { findFile, flattenFiles } from "../../utils/vault";
import { MarkdownView } from "../MarkdownView";
import { FileRow } from "./FileRow";
import { FolderRow } from "./FolderRow";
import { v4 as uuid } from "uuid";
import { t } from "../../i18n";

export function NoteContent({
  block,
  boardId,
}: {
  block: Block;
  boardId?: string;
}) {
  const language = useDashboardStore((s) => s.language);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.data.markdown ?? "");

  useEffect(() => {
    const handleOpen = () => {
      setDraft(block.data.markdown ?? "");
      setEditing(true);
    };
    window.addEventListener(`open-note-editor-${block.id}`, handleOpen);
    return () => window.removeEventListener(`open-note-editor-${block.id}`, handleOpen);
  }, [block.id, block.data.markdown]);

  function save() {
    updateBlockData(block.id, { markdown: draft }, boardId);
    setEditing(false);
  }

  function cancel() {
    setDraft(block.data.markdown ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              cancel();
            }

            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              save();
            }
          }}
          onWheel={(e) => e.stopPropagation()}
          style={{
            height: "clamp(320px, 60vh, 700px)",
          }}
          className="nodrag nowheel w-full resize-none overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2.5 font-mono-techno text-[13px] leading-relaxed text-slate-200 focus:border-cyan-400/40 focus:outline-none"
        />

        <div className="flex items-center gap-2">
          <span className="mr-auto text-[10px] text-slate-500">
            {t("content.note.hint", language)}
          </span>

          <button
            onClick={cancel}
            className="rounded-md px-2.5 py-1 text-xs text-slate-400 hover:bg-white/5"
          >
            {t("content.note.cancel", language)}
          </button>

          <button
            onClick={save}
            className="rounded-md bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-400/25"
          >
            {t("content.note.save", language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        if (e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();

        setDraft(block.data.markdown ?? "");
        setEditing(true);
      }}
      onWheel={(e) => e.stopPropagation()}
      style={{
        maxHeight: "60vh",
        overscrollBehavior: "contain",
      }}
      className="nodrag nowheel overflow-y-auto pr-2"
      title={t("content.note.editTitle", language)}
    >
      <MarkdownView
        content={
          block.data.markdown ||
          t("content.note.empty", language)
        }
      />
    </div>
  );
}

export function ChecklistContent({ block, boardId }: { block: Block; boardId?: string }) {
  const language = useDashboardStore((s) => s.language);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);
  const [text, setText] = useState("");
  const items = block.data.items ?? [];

  function toggle(id: string) {
  const updatedItems = items.map((item) =>
    item.id === id
      ? { ...item, done: !item.done }
      : item
  );

  const sortedItems = [
    ...updatedItems.filter((item) => !item.done),
    ...updatedItems.filter((item) => item.done),
  ];

  updateBlockData(
    block.id,
    { items: sortedItems },
    boardId
  );
}
  function remove(id: string) {
    updateBlockData(block.id, { items: items.filter((i) => i.id !== id) }, boardId);
  }
  function add() {
  if (!text.trim()) return;

  const newItem = {
    id: uuid(),
    label: text.trim(),
    done: false,
  };

  const nextItems = [
    newItem,
    ...items.filter((item) => !item.done),
    ...items.filter((item) => item.done),
  ];

  updateBlockData(block.id, { items: nextItems }, boardId);
  setText("");
}

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <label
          key={item.id}
          className="group/item flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-white/[0.03]"
        >
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => toggle(item.id)}
            className="h-3.5 w-3.5 rounded accent-cyan-400"
          />
          <span className={`flex-1 text-sm ${item.done ? "text-slate-500 line-through" : "text-slate-300"}`}>
            {item.label}
          </span>
          <button
            onClick={() => remove(item.id)}
            className="text-slate-600 opacity-0 hover:text-rose-300 group-hover/item:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </label>
      ))}
      <div className="flex items-center gap-1.5 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={t("content.checklist.placeholder", language)}
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
        />
        <button onClick={add} className="rounded-md bg-cyan-400/15 p-1.5 text-cyan-300 hover:bg-cyan-400/25">
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function FileListContent({
  block,
  boardId,
}: {
  block: Block;
  boardId?: string;
}) {
  const language = useDashboardStore((s) => s.language);
  const vault = useDashboardStore((s) => s.vault);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);

  const ids = block.data.fileIds ?? [];
  const folderPaths: string[] = (block.data as any).folderPaths ?? [];

  const savedOrder: string[] = (block.data as any).attachmentOrder ?? [];

  const attachmentOrder = [
    ...savedOrder.filter((item) => {
      if (item.startsWith("file:")) {
        return ids.includes(item.slice("file:".length));
      }

      if (item.startsWith("folder:")) {
        return folderPaths.includes(item.slice("folder:".length));
      }

      return false;
    }),

    ...ids
      .filter((id) => !savedOrder.includes(`file:${id}`))
      .map((id) => `file:${id}`),

    ...folderPaths
      .filter((path) => !savedOrder.includes(`folder:${path}`))
      .map((path) => `folder:${path}`),
  ];

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function notify(msg: string) {
    const w = window as any;
    const Notice = w.require?.("obsidian")?.Notice;

    if (Notice) {
      new Notice(msg);
    } else {
      console.warn(msg);
    }
  }

  function pickFolder(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const cp = (window as any).require?.("child_process");

        if (!cp?.execFile) {
          resolve(null);
          return;
        }

        const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select folder'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq 'OK') { Write-Output $dialog.SelectedPath }
`;

        cp.execFile(
          "powershell.exe",
          ["-NoProfile", "-STA", "-Command", script],
          { windowsHide: true },
          (err: any, stdout: string) => {
            if (err) {
              resolve(null);
              return;
            }

            const path = String(stdout).trim();
            resolve(path || null);
          }
        );
      } catch {
        resolve(null);
      }
    });
  }

  async function openExplorer() {
    const w = window as any;

    try {
      const electron = w.require?.("electron");
      const dialog = electron?.remote?.dialog ?? electron?.dialog;
      const basePath: string | undefined =
        w.app?.vault?.adapter?.getBasePath?.();

      if (!dialog) {
        notify("Failed to open file explorer");
        return;
      }

      if (!basePath) {
        notify("Failed to locate Vault path");
        return;
      }

      const result = await dialog.showOpenDialog({
        title: "Select file from Vault",
        defaultPath: basePath,
        properties: ["openFile", "multiSelections"],
      });

      if (result.canceled || !result.filePaths?.length) {
        return;
      }

      const normalizedBasePath = basePath
        .replace(/\\/g, "/")
        .replace(/\/$/, "");

      const newIds: string[] = [];

      async function waitForFile(relativePath: string) {
        const normalizedRelativePath = relativePath
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");

        for (let attempt = 0; attempt < 30; attempt += 1) {
          const currentVault =
            useDashboardStore.getState().vault;

          const file = flattenFiles(currentVault).find(
            (item) =>
              item.kind !== "folder" &&
              item.path.replace(/\\/g, "/").toLowerCase() ===
                normalizedRelativePath.toLowerCase()
          );

          if (file) {
            return file;
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 150);
          });
        }

        return null;
      }

      for (const fullPath of result.filePaths as string[]) {
        const normalizedPath = fullPath.replace(/\\/g, "/");

        const isInsideVault =
          normalizedPath.toLowerCase().startsWith(
            normalizedBasePath.toLowerCase() + "/"
          );

        if (!isInsideVault) {
          continue;
        }

        const relativePath = normalizedPath.slice(
          normalizedBasePath.length + 1
        );

        const file = await waitForFile(relativePath);

        if (!file) {
          continue;
        }

        if (
          !ids.includes(file.id) &&
          !newIds.includes(file.id)
        ) {
          newIds.push(file.id);
        }
      }

      if (newIds.length === 0) {
        return;
      }

      updateBlockData(
        block.id,
        {
          fileIds: [...ids, ...newIds],
          attachmentOrder: [
            ...attachmentOrder,
            ...newIds.map((id) => `file:${id}`),
          ],
        } as any,
        boardId
      );
    } catch (error) {
      console.error("Error picking files:", error);
    }
  }

  async function openFolderPicker() {
    const pickedPath = await pickFolder();

    if (!pickedPath) return;

    if (folderPaths.includes(pickedPath)) {
      return;
    }

    updateBlockData(
      block.id,
      {
        folderPaths: [...folderPaths, pickedPath],
        attachmentOrder: [
          ...attachmentOrder,
          `folder:${pickedPath}`,
        ],
      } as any,
      boardId
    );
  }

  useEffect(() => {
    const handleOpenFile = () => {
      void openExplorer();
    };

    const handleOpenFolder = () => {
      void openFolderPicker();
    };

    window.addEventListener(
      `open-file-picker-${block.id}`,
      handleOpenFile
    );

    window.addEventListener(
      `open-folder-picker-${block.id}`,
      handleOpenFolder
    );

    return () => {
      window.removeEventListener(
        `open-file-picker-${block.id}`,
        handleOpenFile
      );

      window.removeEventListener(
        `open-folder-picker-${block.id}`,
        handleOpenFolder
      );
    };
  }, [block.id, ids, folderPaths, vault, attachmentOrder]);

  function removeFile(id: string) {
    updateBlockData(
      block.id,
      {
        fileIds: ids.filter((item) => item !== id),
        attachmentOrder: attachmentOrder.filter(
          (item) => item !== `file:${id}`
        ),
      } as any,
      boardId
    );
  }

  function removeFolder(path: string) {
    updateBlockData(
      block.id,
      {
        folderPaths: folderPaths.filter((item) => item !== path),
        attachmentOrder: attachmentOrder.filter(
          (item) => item !== `folder:${path}`
        ),
      } as any,
      boardId
    );
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();

    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextOrder = [...attachmentOrder];
    const [movedItem] = nextOrder.splice(dragIndex, 1);

    const targetIndex = dragIndex < index ? index - 1 : index;

    nextOrder.splice(targetIndex, 0, movedItem);

    updateBlockData(
      block.id,
      { attachmentOrder: nextOrder } as any,
      boardId
    );

    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-1.5">
      {attachmentOrder.map((attachment, index) => {
        if (attachment.startsWith("file:")) {
          const fileId = attachment.slice("file:".length);
          const file = findFile(vault, fileId);

          if (!file) return null;

          return (
            <FileRow
              key={attachment}
              file={file}
              onRemove={() => removeFile(fileId)}
              draggable={true}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverIndex === index}
            />
          );
        }

        if (attachment.startsWith("folder:")) {
          const path = attachment.slice("folder:".length);

          return (
            <FolderRow
              key={attachment}
              path={path}
              onRemove={() => removeFolder(path)}
              draggable={true}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverIndex === index}
            />
          );
        }

        return null;
      })}

      {attachmentOrder.length === 0 && (
        <p className="rounded-lg border border-white/10 py-3 text-center text-xs text-slate-500">
          {t("content.fileList.empty", language)}
        </p>
      )}
    </div>
  );
}

/* ---------- утилиты для ссылок ---------- */

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /^(mailto|tel):/i.test(s)) return s;
  return `https://${s}`;
}

function openExternalUrl(raw: string) {
  const target = normalizeUrl(raw);
  if (!target) return;
  const w = window as any;
  try {
    const shell = w.require?.("electron")?.shell;
    if (shell?.openExternal) {
      void shell.openExternal(target);
      return;
    }
  } catch {
    /* переходим к обычному способу */
  }
  window.open(target, "_blank", "noopener,noreferrer");
}

export function LinkContent({ block, boardId }: { block: Block; boardId?: string }) {
  const language = useDashboardStore((s) => s.language);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const [addingNew, setAddingNew] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const [menu, setMenu] = useState<{ x: number; y: number; linkId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pressRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number; h: number } | null>(null);

  const links: LinkEntry[] =
    block.data.links ??
    (block.data.url
      ? [{ id: "legacy-link", url: block.data.url, label: block.data.linkLabel ?? "Link" }]
      : []);

  function commitLinks(next: LinkEntry[]) {
    updateBlockData(block.id, { links: next, url: undefined, linkLabel: undefined }, boardId);
  }

  useEffect(() => {
    if (!menu) return;
    function onDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    const close = () => setMenu(null);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent, linkId: string) {
    e.preventDefault();
    e.stopPropagation();
    const MENU_W = 176;
    const MENU_H = 170;
    const GAP = 8;
    let x = e.clientX;
    let y = e.clientY;
    if (x + MENU_W > window.innerWidth - GAP) x = window.innerWidth - MENU_W - GAP;
    if (y + MENU_H > window.innerHeight - GAP) y = e.clientY - MENU_H;
    if (y < GAP) y = GAP;
    setMenu({ x, y, linkId });
  }

  function startEdit(link: LinkEntry) {
    setAddingNew(false);
    setEditingId(link.id);
    setUrl(link.url);
    setLabel(link.label);
  }

  function saveEdit() {
    if (!editingId) return;
    const u = url.trim();
    if (!u) return;
    commitLinks(links.map((l) => (l.id === editingId ? { ...l, url: u, label: label.trim() || u } : l)));
    setEditingId(null);
  }

  function removeLink(id: string) {
  commitLinks(links.filter((link) => link.id !== id));

  if (editingId === id) {
    setEditingId(null);
  }
}

  function addLink() {
    const u = newUrl.trim();
    if (!u) return;
    commitLinks([...links, { id: uuid(), url: u, label: newLabel.trim() || u }]);
    setNewUrl("");
    setNewLabel("");
    setAddingNew(false);
  }

  function computeDrop(clientX: number, clientY: number) {
    let index = links.length;
    let bestDist = Infinity;
    links.forEach((l, i) => {
      const r = chipRefs.current[l.id]?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = (clientY - cy) * 3;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        index = clientX < cx ? i : i + 1;
      }
    });

    let mk: { x: number; y: number; h: number } | null = null;
    const cont = containerRef.current?.getBoundingClientRect();
    if (cont && links.length > 0) {
      const atEnd = index >= links.length;
      const target = links[atEnd ? links.length - 1 : index];
      const r = chipRefs.current[target.id]?.getBoundingClientRect();
      if (r) {
        mk = {
          x: (atEnd ? r.right + 2 : r.left - 4) - cont.left,
          y: r.top - cont.top,
          h: r.height,
        };
      }
    }
    return { index, marker: mk };
  }

  function resetDrag() {
    pressRef.current = null;
    setDragId(null);
    setGhost(null);
    setMarker(null);
  }

  function onChipPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    if (e.button !== 0) return;
    if (menu) {
      setMenu(null);
      return;
    }
    e.stopPropagation();
    pressRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  function onChipPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const p = pressRef.current;
    if (!p) return;
    if (!p.moved) {
      if (Math.abs(e.clientX - p.startX) + Math.abs(e.clientY - p.startY) < 6) return;
      p.moved = true;
      setDragId(p.id);
    }
    setGhost({ x: e.clientX, y: e.clientY });
    setMarker(computeDrop(e.clientX, e.clientY).marker);
  }

  function onChipPointerUp(e: React.PointerEvent<HTMLDivElement>, link: LinkEntry) {
    const p = pressRef.current;
    pressRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (!p) return;

    if (p.moved) {
      const { index } = computeDrop(e.clientX, e.clientY);
      const from = links.findIndex((l) => l.id === p.id);
      const to = index > from ? index - 1 : index;
      if (from >= 0 && to !== from) {
        const next = [...links];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        commitLinks(next);
      }
      resetDrag();
      return;
    }

    openExternalUrl(link.url);
  }

  const dragging = dragId ? links.find((l) => l.id === dragId) ?? null : null;
  const menuLink = menu ? links.find((l) => l.id === menu.linkId) ?? null : null;

  return (
    <div className="space-y-1.5">
      <div ref={containerRef} className="nodrag relative flex flex-wrap items-center gap-1.5">
        {links.map((link) =>
          editingId === link.id ? (
            <div
              key={link.id}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full space-y-1.5 rounded-lg border border-cyan-400/20 bg-black/20 p-2"
            >
              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                placeholder={t("content.link.titlePlaceholder", language)}
                className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                placeholder="https://..."
                className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono-techno text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingId(null)} className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5">
                  {t("content.note.cancel", language)}
                </button>
                <button onClick={saveEdit} className="rounded-md bg-cyan-400/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-400/25">
                  {t("content.note.save", language)}
                </button>
              </div>
            </div>
          ) : (
            <div
              key={link.id}
              ref={(el) => {
                chipRefs.current[link.id] = el;
              }}
              role="link"
              tabIndex={0}
              title={normalizeUrl(link.url)}
              onPointerDown={(e) => onChipPointerDown(e, link.id)}
              onPointerMove={onChipPointerMove}
              onPointerUp={(e) => onChipPointerUp(e, link)}
              onPointerCancel={resetDrag}
              onContextMenu={(e) => openMenu(e, link.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openExternalUrl(link.url);
              }}
              style={{ touchAction: "none", cursor: dragId ? "grabbing" : "pointer" }}
              className={`nodrag flex max-w-full select-none items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200 focus:outline-none focus-visible:border-cyan-400/60 ${
                dragId === link.id ? "opacity-30" : ""
              }`}
            >
              <span className="max-w-[200px] truncate">{link.label}</span>
            </div>
          )
        )}

        {!addingNew && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAddingNew(true);
            }}
            title={t("content.link.addTitle", language)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "none",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(56,232,255,0.6)";
              e.currentTarget.style.background = "rgba(56,232,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span
              style={{
                color: "#cbd5e1",
                fontSize: "18px",
                fontWeight: "700",
                lineHeight: "18px",
                display: "block",
                transform: "translateY(-1px)",
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              +
            </span>
          </button>
        )}

        {marker && (
          <span
            className="pointer-events-none absolute w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,232,255,.9)]"
            style={{ left: marker.x, top: marker.y, height: marker.h }}
          />
        )}
      </div>

      {links.length === 0 && !addingNew && (
        <p className="rounded-lg border border-white/10 py-3 text-center text-xs text-slate-500">
          {t("content.link.empty", language)}
        </p>
      )}

      {addingNew && (
        <div className="mt-1.5 space-y-1.5 rounded-lg border border-cyan-400/20 bg-black/20 p-2">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLink();
              if (e.key === "Escape") setAddingNew(false);
            }}
            placeholder={t("content.link.titlePlaceholder", language)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLink();
              if (e.key === "Escape") setAddingNew(false);
            }}
            placeholder="https://..."
            className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono-techno text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAddingNew(false);
                setNewUrl("");
                setNewLabel("");
              }}
              className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5"
            >
              {t("content.note.cancel", language)}
            </button>
            <button onClick={addLink} className="rounded-md bg-cyan-400/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-400/25">
              {t("content.link.add", language)}
            </button>
          </div>
        </div>
      )}

      {dragging &&
        ghost &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/50 bg-[#0d131b] px-3 py-1.5 text-xs text-slate-100 shadow-2xl"
            style={{ left: ghost.x, top: ghost.y }}
          >
            {dragging.label}
          </div>,
          document.body
        )}

      {menu &&
        menuLink &&
        createPortal(
          <div
            ref={menuRef}
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-[9999] w-44 rounded-md border border-white/10 bg-[#1e1e1e] p-1 shadow-xl"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  openExternalUrl(menuLink.url);
                  setMenu(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-cyan-300 hover:bg-cyan-400/10"
              >
                <ExternalLink size={14} />
                {t("content.link.open", language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  startEdit(menuLink);
                  setMenu(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-white/10 hover:text-slate-100"
              >
                <Pencil size={14} />
                {t("content.link.edit", language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(normalizeUrl(menuLink.url));
                  setMenu(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                <Copy size={14} />
                {t("content.link.copy", language)}
              </button>
              <div className="my-0.5 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  removeLink(menuLink.id);
                  setMenu(null);
                }}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
              >
                <Trash2 size={14} />
                {t("content.link.delete", language)}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function BoardListContent({ block, boardId }: { block: Block; boardId?: string }) {
  const language = useDashboardStore((s) => s.language);
  const navigate = useDashboardStore((s) => s.navigate);
  const boards = useDashboardStore((s) => s.boards);
  const createBoard = useDashboardStore((s) => s.createBoard);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);
  const [newTitle, setNewTitle] = useState("");

  const ids = block.data.boardIds ?? [];

  function addItem() {
    if (!newTitle.trim()) return;
    const id = createBoard(newTitle.trim());
    updateBlockData(block.id, { boardIds: [...ids, id] }, boardId);
    setNewTitle("");
  }

  function removeItem(id: string) {
    updateBlockData(block.id, { boardIds: ids.filter((i) => i !== id) }, boardId);
  }

  return (
    <div className="space-y-1.5">
      {ids.map((id) => {
        const sub = boards[id];
        if (!sub) return null;
        return (
          <div
            key={id}
            className="group flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 transition hover:border-cyan-400/20"
          >
            <button
              onClick={() => navigate({ name: "board", boardId: id })}
              className="min-w-0 flex-1 text-left text-xs text-slate-200 truncate"
            >
              {sub.title}
            </button>
            <span className="shrink-0 text-[9px] text-slate-500">
              {t("block.blocksCount", language, { count: sub.blocks.length })}
            </span>
            <button
              onClick={() => removeItem(id)}
              className="shrink-0 text-slate-500 opacity-0 hover:text-rose-300 group-hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      {ids.length === 0 && (
        <p className="rounded-lg border border-white/10 py-3 text-center text-xs text-slate-500">
          {t("content.boardList.empty", language)}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={t("content.boardList.placeholder", language)}
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
        />
        <button onClick={addItem} className="rounded-md bg-cyan-400/15 p-1.5 text-cyan-300 hover:bg-cyan-400/25">
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function FlowchartMiniContent({ block, boardId }: { block: Block; boardId?: string }) {
  const language = useDashboardStore((s) => s.language);
  const navigate = useDashboardStore((s) => s.navigate);
  const createFlowchartFile = useDashboardStore((s) => s.createFlowchartFile);
  const updateBlockData = useDashboardStore((s) => s.updateBlockData);
  const vault = useDashboardStore((s) => s.vault);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const ids: string[] =
    block.data.flowchartIds?.length
      ? block.data.flowchartIds
      : block.data.flowchartId
        ? [block.data.flowchartId]
        : [];

  const allFlows = flattenFiles(vault).filter((f) => f.kind === "flowchart");

  function removeFlow(path: string) {
    const next = ids.filter((p) => p !== path);

    updateBlockData(
      block.id,
      {
        flowchartIds: next,
        flowchartId: next[0],
      }, 
      boardId
    );
  }

  async function createNew() {
    if (creating) return;

    setCreating(true);

    try {
      const created = await createFlowchartFile(
        newName.trim() || t("content.flowchart.newDefault", language)
      );

      if (created) {
        const next = [...ids, created];

        updateBlockData(
          block.id,
          {
            flowchartIds: next,
            flowchartId: next[0],
          },
          boardId
        );

        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      {ids.map((path) => {
        const file = allFlows.find((f) => f.path === path);

        if (file) {
          return (
            <FileRow
              key={path}
              file={file}
              onRemove={() => removeFlow(path)}
            />
          );
        }

        return (
          <div
            key={path}
            className="group flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 transition hover:border-cyan-400/20 hover:bg-white/[0.04]"
          >
            <div className="h-3.5 w-3.5 shrink-0 rounded-sm bg-violet-400/40" />

            <button
              type="button"
              onClick={() => navigate({ name: "flowchart", path })}
              className="min-w-0 flex-1 overflow-hidden text-center"
              title={`Open ${path}`}
            >
              <p className="block w-full truncate text-center text-xs text-slate-200">
                {path.split("/").pop()?.replace(/\.flow$/i, "") ?? path}
              </p>
            </button>

            <button
              type="button"
              onClick={() => removeFlow(path)}
              className="shrink-0 rounded p-1 text-slate-500 opacity-0 transition hover:text-rose-300 group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}

      {ids.length === 0 && (
        <p className="rounded-lg border border-white/10 py-3 text-center text-xs text-slate-500">
          {t("content.flowchart.empty", language)}
        </p>
      )}

      <div className="flex items-center gap-1.5 pt-0.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void createNew()}
          placeholder={t("content.flowchart.placeholder", language)}
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-200 focus:border-violet-400/40 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => void createNew()}
          disabled={creating}
          className="flex shrink-0 items-center gap-1 rounded-md bg-violet-400/15 px-2.5 py-1 text-xs text-violet-300 hover:bg-violet-400/25 disabled:opacity-50"
        >
          <Plus size={12} />
          {creating ? "..." : t("content.flowchart.create", language)}
        </button>
      </div>
    </div>
  );
}


export function ViewToggleIcon({ editing }: { editing: boolean }) {
  return editing ? <Eye size={13} /> : <Pencil size={13} />;
}