import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Square,
  Circle,
  Share2,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Save,
  Maximize,
  Pencil,
  ChevronsUp,
  ChevronsDown,
  Image as ImageIcon,
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import type { FlowchartDoc } from "../types";
import { v4 as uuid } from "uuid";

type BoardType = "sticky" | "text" | "rect" | "ellipse" | "image";
type Side = "top" | "right" | "bottom" | "left";
type Tool = "select" | "pan" | "connect" | BoardType;

interface BoardItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: BoardType;
  color: string;
  text: string;
  fontSize: number;
  src?: string;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
}

interface Snapshot {
  items: BoardItem[];
  conns: Connection[];
}

type DragState =
  | { mode: "none" }
  | { mode: "pan"; startScreenX: number; startScreenY: number; startPanX: number; startPanY: number }
  | { mode: "marquee"; startWorldX: number; startWorldY: number; curWorldX: number; curWorldY: number; shift: boolean; startSelection: string[] }
  | { mode: "node-drag"; startScreenX: number; startScreenY: number; orig: Map<string, { x: number; y: number }>; moved: boolean; startSnapshot: Snapshot }
  | { mode: "resize"; id: string; handle: string; startWorldX: number; startWorldY: number; orig: BoardItem; moved: boolean; startSnapshot: Snapshot }
  | { mode: "connect"; fromId: string; fromSide: Side; startWorldX: number; startWorldY: number; hoverId: string | null; hoverSide: Side };

const COLORS = ["#facc15", "#fb7185", "#34d399", "#38bdf8", "#a78bfa", "#f97316", "#e2e8f0"];

function defaultColor(t: BoardType) {
  if (t === "sticky") return "#facc15";
  if (t === "text") return "#e2e8f0";
  return "#38bdf8";
}
function defaultText(t: BoardType) {
  if (t === "sticky") return "Стикер";
  if (t === "text") return "Текст";
  if (t === "ellipse") return "Овал";
  if (t === "image") return "";
  return "Блок";
}
function normalizeType(raw?: string): BoardType {
  if (raw === "sticky" || raw === "text" || raw === "rect" || raw === "ellipse" || raw === "image") return raw;
  if (raw === "start-end") return "ellipse";
  if (raw === "decision" || raw === "document" || raw === "data" || raw === "process") return "rect";
  return "sticky";
}
function createItem(type: BoardType, x: number, y: number): BoardItem {
  return {
    id: uuid(),
    x, y,
    w: type === "sticky" ? 180 : type === "text" ? 220 : 170,
    h: type === "sticky" ? 120 : type === "text" ? 60 : 90,
    type,
    color: defaultColor(type),
    text: defaultText(type),
    fontSize: type === "text" ? 22 : 14,
  };
}
function getPortPos(it: BoardItem, side: Side) {
  if (side === "top") return { x: it.x + it.w / 2, y: it.y };
  if (side === "bottom") return { x: it.x + it.w / 2, y: it.y + it.h };
  if (side === "left") return { x: it.x, y: it.y + it.h / 2 };
  return { x: it.x + it.w, y: it.y + it.h / 2 };
}
function closestSide(it: BoardItem, p: { x: number; y: number }): Side {
  const ports: Side[] = ["top", "right", "bottom", "left"];
  let best: Side = "right";
  let bestD = Infinity;
  for (const s of ports) {
    const q = getPortPos(it, s);
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}
function bezierPath(x1: number, y1: number, x2: number, y2: number, s1: Side, s2: Side) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const off = Math.max(40, Math.min(160, Math.max(dx, dy) * 0.4));
  const v1 = s1 === "left" ? { x: -off, y: 0 } : s1 === "right" ? { x: off, y: 0 } : s1 === "top" ? { x: 0, y: -off } : { x: 0, y: off };
  const v2 = s2 === "left" ? { x: -off, y: 0 } : s2 === "right" ? { x: off, y: 0 } : s2 === "top" ? { x: 0, y: -off } : { x: 0, y: off };
  return `M ${x1} ${y1} C ${x1 + v1.x} ${y1 + v1.y}, ${x2 + v2.x} ${y2 + v2.y}, ${x2} ${y2}`;
}
function cloneSnap(items: BoardItem[], conns: Connection[]): Snapshot {
  return { items: items.map((i) => ({ ...i })), conns: conns.map((c) => ({ ...c })) };
}

/* Инлайн-стили порта — размер на экране постоянный при любом зуме */
function portStyle(side: Side, zoom: number): React.CSSProperties {
  const s = 16 / zoom;
  const off = -s / 2;
  const base: React.CSSProperties = {
    position: "absolute",
    width: s,
    height: s,
    borderRadius: 999,
    background: "#38e8ff",
    border: `${Math.max(1.5, 2 / zoom)}px solid #070a0f`,
    boxShadow: "0 0 0 1.5px rgba(56,232,255,.5)",
    cursor: "crosshair",
    zIndex: 20,
    touchAction: "none",
  };
  if (side === "top") return { ...base, top: off, left: "50%", marginLeft: off };
  if (side === "bottom") return { ...base, bottom: off, left: "50%", marginLeft: off };
  if (side === "left") return { ...base, left: off, top: "50%", marginTop: off };
  return { ...base, right: off, top: "50%", marginTop: off };
}

/* Инлайн-стили ручки ресайза */
function resizeHandleStyle(handle: string, zoom: number): React.CSSProperties {
  const s = 11 / zoom;
  const off = -s / 2 - 1 / zoom;
  const base: React.CSSProperties = {
    position: "absolute",
    width: s,
    height: s,
    borderRadius: Math.max(1.5, 3 / zoom),
    background: "#ffffff",
    border: `${Math.max(1.5, 2 / zoom)}px solid #38e8ff`,
    zIndex: 21,
    touchAction: "none",
  };
  switch (handle) {
    case "nw": return { ...base, left: off, top: off, cursor: "nwse-resize" };
    case "se": return { ...base, right: off, bottom: off, cursor: "nwse-resize" };
    case "ne": return { ...base, right: off, top: off, cursor: "nesw-resize" };
    case "sw": return { ...base, left: off, bottom: off, cursor: "nesw-resize" };
    case "n": return { ...base, left: "50%", top: off, marginLeft: -s / 2, cursor: "ns-resize" };
    case "s": return { ...base, left: "50%", bottom: off, marginLeft: -s / 2, cursor: "ns-resize" };
    case "w": return { ...base, left: off, top: "50%", marginTop: -s / 2, cursor: "ew-resize" };
    default: return { ...base, right: off, top: "50%", marginTop: -s / 2, cursor: "ew-resize" };
  }
}

export default function FlowchartPage({ path }: { path: string }) {
  const goBack = useDashboardStore((s) => s.goBack);
  const loadFlowchart = useDashboardStore((s) => s.loadFlowchart);
  const saveFlowchart = useDashboardStore((s) => s.saveFlowchart);
  const pushToast = useDashboardStore((s) => s.pushToast);

  const [doc, setDoc] = useState<FlowchartDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<BoardItem[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [pan, setPan] = useState({ x: 120, y: 80 });
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [spaceDown, setSpaceDown] = useState(false);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [connectPreview, setConnectPreview] = useState<{ x1: number; y1: number; x2: number; y2: number; targetId: string | null } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ mode: "none" });
  const spaceRef = useRef(false);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const clipboardRef = useRef<{ items: BoardItem[]; conns: Connection[] } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const itemsRef = useRef<BoardItem[]>([]);
  const connsRef = useRef<Connection[]>([]);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  itemsRef.current = items;
  connsRef.current = conns;
  panRef.current = pan;
  zoomRef.current = zoom;

  const [, bumpHist] = useState(0);
  const singleSelected = selectedIds.length === 1 ? items.find((i) => i.id === selectedIds[0]) || null : null;

  /* ---------- загрузка ---------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFlowchart(path).then((loaded) => {
      if (cancelled) return;
      if (!loaded) { setDoc(null); setLoading(false); return; }
      setDoc(loaded);
      const rawNodes = (loaded.nodes || []) as unknown as Array<{ id: string; position?: { x: number; y: number }; data?: Record<string, unknown> }>;
      const rawEdges = (loaded.edges || []) as unknown as Array<{ id?: string; source: string; target: string; fromSide?: Side; toSide?: Side }>;
      setItems(rawNodes.map((n, idx) => {
        const d = (n.data || {}) as { label?: unknown; nodeType?: unknown; color?: unknown; width?: unknown; height?: unknown; fontSize?: unknown; src?: unknown };
        const type = normalizeType(typeof d.nodeType === "string" ? d.nodeType : undefined);
        return {
          id: n.id || uuid(),
          x: n.position?.x ?? 150 + (idx % 5) * 200,
          y: n.position?.y ?? 150 + Math.floor(idx / 5) * 160,
          w: typeof d.width === "number" ? d.width : type === "sticky" ? 180 : type === "text" ? 220 : 170,
          h: typeof d.height === "number" ? d.height : type === "sticky" ? 120 : type === "text" ? 60 : 90,
          type,
          color: typeof d.color === "string" ? d.color : defaultColor(type),
          text: typeof d.label === "string" ? d.label : defaultText(type),
          fontSize: typeof d.fontSize === "number" ? d.fontSize : type === "text" ? 22 : 14,
          src: typeof d.src === "string" ? d.src : undefined,
        };
      }));
      setConns(rawEdges.map((e) => ({
        id: e.id || uuid(),
        from: e.source,
        to: e.target,
        fromSide: e.fromSide || "right",
        toSide: e.toSide || "left",
      })));
      pastRef.current = [];
      futureRef.current = [];
      setDirty(false);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => { editRef.current?.focus(); editRef.current?.select(); }, [editingId]);

  /* ---------- координаты ---------- */
  function getWorldPoint(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    };
  }
  function snapshotNow(): Snapshot {
    return cloneSnap(itemsRef.current, connsRef.current);
  }
  function pushHistory() {
    pastRef.current.push(snapshotNow());
    if (pastRef.current.length > 60) pastRef.current.shift();
    futureRef.current = [];
    bumpHist((v) => v + 1);
    setDirty(true);
  }
  function undo() {
    const past = pastRef.current.pop();
    if (!past) return;
    futureRef.current.push(snapshotNow());
    setItems(past.items.map((i) => ({ ...i })));
    setConns(past.conns.map((c) => ({ ...c })));
    setSelectedIds([]); setSelectedEdgeIds([]);
    bumpHist((v) => v + 1); setDirty(true);
  }
  function redo() {
    const fut = futureRef.current.pop();
    if (!fut) return;
    pastRef.current.push(snapshotNow());
    setItems(fut.items.map((i) => ({ ...i })));
    setConns(fut.conns.map((c) => ({ ...c })));
    setSelectedIds([]); setSelectedEdgeIds([]);
    bumpHist((v) => v + 1); setDirty(true);
  }

  /* ---------- колесо: Ctrl = зум, без Ctrl = прокрутка ---------- */
  useEffect(() => {
    if (loading) return;
    const el = boardRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        const rect = el!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const oldZoom = zoomRef.current;
        const oldPan = panRef.current;
        const wx = (mx - oldPan.x) / oldZoom;
        const wy = (my - oldPan.y) / oldZoom;
        const factor = 1 - e.deltaY * 0.0022;
        const nz = Math.min(2.5, Math.max(0.25, oldZoom * factor));
        setZoom(nz);
        setPan({ x: mx - wx * nz, y: my - wy * nz });
        return;
      }
      if (e.shiftKey) {
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        setPan((p) => ({ x: p.x - delta, y: p.y }));
        return;
      }
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [loading]);

  /* ---------- клавиатура ---------- */
  useEffect(() => {
    function onDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === " " && !typing && !editingId) {
        spaceRef.current = true; setSpaceDown(true); e.preventDefault(); return;
      }
      if (editingId) {
        if (e.key === "Escape") { e.preventDefault(); commitEdit(); }
        e.stopPropagation();
        return;
      }
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); undo(); return; }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); e.stopPropagation(); redo(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); e.stopPropagation(); duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copySelected(); return; }
      if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); e.stopPropagation(); saveBoard(true); return; }
      if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); setSelectedIds(itemsRef.current.map((i) => i.id)); return; }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return; }
      if (e.key === "Escape") {
        setContextMenu(null); setConnectPreview(null);
        dragRef.current = { mode: "none" };
        if (tool !== "select") setTool("select"); else { setSelectedIds([]); setSelectedEdgeIds([]); }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "v" || k === "м") setTool("select");
      else if (k === "h" || k === "р") setTool("pan");
      else if (k === "s" || k === "ы") setTool("sticky");
      else if (k === "t" || k === "е") setTool("text");
      else if (k === "r" || k === "к") setTool("rect");
      else if (k === "o" || k === "щ") setTool("ellipse");
      else if (k === "c" || k === "с") setTool("connect");
      else if (k === "f" || k === "а") fitView();
      else if (e.key === "+" || e.key === "=") zoomAtCenter(1.15);
      else if (e.key === "-") zoomAtCenter(0.87);
      else if (e.key === "0") { setZoom(1); }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key === " ") { spaceRef.current = false; setSpaceDown(false); }
    }
    document.addEventListener("keydown", onDown, true);
    document.addEventListener("keyup", onUp, true);
    return () => { document.removeEventListener("keydown", onDown, true); document.removeEventListener("keyup", onUp, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, tool, editingText]);

  /* ---------- автосейв ---------- */
  useEffect(() => {
    if (!autoSave || !dirty || !doc) return;
    const t = setTimeout(() => saveBoard(false), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, autoSave, items, conns]);

  /* ---------- действия ---------- */
  function deleteSelected() {
    if (selectedIds.length === 0 && selectedEdgeIds.length === 0) return;
    pushHistory();
    const del = new Set(selectedIds);
    setItems((prev) => prev.filter((i) => !del.has(i.id)));
    setConns((prev) => prev.filter((c) => !del.has(c.from) && !del.has(c.to) && !selectedEdgeIds.includes(c.id)));
    setSelectedIds([]); setSelectedEdgeIds([]); setContextMenu(null);
  }
  function duplicateSelected() {
    if (selectedIds.length === 0) return;
    pushHistory();
    const map = new Map<string, string>();
    selectedIds.forEach((id) => map.set(id, uuid()));
    const clones = itemsRef.current.filter((i) => map.has(i.id)).map((i) => ({ ...i, id: map.get(i.id)!, x: i.x + 32, y: i.y + 32 }));
    const internal = connsRef.current.filter((c) => map.has(c.from) && map.has(c.to)).map((c) => ({ ...c, id: uuid(), from: map.get(c.from)!, to: map.get(c.to)! }));
    setItems((p) => [...p, ...clones]);
    setConns((p) => [...p, ...internal]);
    setSelectedIds(clones.map((c) => c.id));
  }
  function copySelected() {
    const sel = itemsRef.current.filter((i) => selectedIds.includes(i.id));
    if (sel.length === 0) return;
    const ids = new Set(sel.map((i) => i.id));
    clipboardRef.current = { items: sel.map((i) => ({ ...i })), conns: connsRef.current.filter((c) => ids.has(c.from) && ids.has(c.to)).map((c) => ({ ...c })) };
  }
  function pasteClipboard() {
    const cb = clipboardRef.current;
    if (!cb || cb.items.length === 0) return;
    pushHistory();
    const map = new Map<string, string>();
    cb.items.forEach((i) => map.set(i.id, uuid()));
    const clones = cb.items.map((i) => ({ ...i, id: map.get(i.id)!, x: i.x + 40, y: i.y + 40 }));
    const ec = cb.conns.map((c) => ({ ...c, id: uuid(), from: map.get(c.from)!, to: map.get(c.to)! }));
    setItems((p) => [...p, ...clones]);
    setConns((p) => [...p, ...ec]);
    setSelectedIds(clones.map((c) => c.id));
    clipboardRef.current = { items: clones.map((i) => ({ ...i })), conns: ec.map((c) => ({ ...c })) };
  }
  function commitEdit() {
    if (!editingId) return;
    const cur = itemsRef.current.find((i) => i.id === editingId);
    if (cur && cur.text !== editingText) {
      pushHistory();
      setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, text: editingText } : i)));
    }
    setEditingId(null);
  }
  async function saveBoard(manual: boolean) {
    if (!doc) return;
    const updated = {
      ...doc,
      nodes: itemsRef.current.map((it) => ({
        id: it.id,
        position: { x: Math.round(it.x), y: Math.round(it.y) },
        data: { label: it.text, nodeType: it.type, color: it.color, width: Math.round(it.w), height: Math.round(it.h), fontSize: it.fontSize, src: it.src },
      })),
      edges: connsRef.current.map((c) => ({ id: c.id, source: c.from, target: c.to, fromSide: c.fromSide, toSide: c.toSide, label: undefined, animated: false })),
    } as unknown as FlowchartDoc;
    await saveFlowchart(path, updated);
    setDirty(false);
    if (manual) pushToast("success", "Доска сохранена", doc.name);
  }
  function fitView() {
    const list = itemsRef.current;
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (list.length === 0) { setPan({ x: rect.width / 2 - 200, y: rect.height / 2 - 100 }); setZoom(1); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    list.forEach((i) => { minX = Math.min(minX, i.x); minY = Math.min(minY, i.y); maxX = Math.max(maxX, i.x + i.w); maxY = Math.max(maxY, i.y + i.h); });
    const pad = 80;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const nz = Math.min(1.5, Math.max(0.25, Math.min(rect.width / bw, rect.height / bh)));
    setZoom(nz);
    setPan({ x: rect.width / 2 - ((minX + maxX) / 2) * nz, y: rect.height / 2 - ((minY + maxY) / 2) * nz });
  }
  function zoomAtCenter(f: number) {
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2, my = rect.height / 2;
    const nz = Math.min(2.5, Math.max(0.25, zoomRef.current * f));
    const wx = (mx - panRef.current.x) / zoomRef.current, wy = (my - panRef.current.y) / zoomRef.current;
    setZoom(nz); setPan({ x: mx - wx * nz, y: my - wy * nz });
  }

  function addImageFromFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        const probe = new window.Image();

        probe.onload = () => {
          const maxDim = 340;
          let w = probe.naturalWidth || 240;
          let h = probe.naturalHeight || 160;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);

          const el = boardRef.current;
          const rect = el?.getBoundingClientRect();
          const centerClientX = (rect?.left ?? 0) + (rect?.width ?? 800) / 2;
          const centerClientY = (rect?.top ?? 0) + (rect?.height ?? 600) / 2;
          const world = getWorldPoint(centerClientX, centerClientY);

          pushHistory();
          const it: BoardItem = {
            id: uuid(),
            x: world.x - w / 2,
            y: world.y - h / 2,
            w,
            h,
            type: "image",
            color: "#38bdf8",
            text: "",
            fontSize: 14,
            src,
          };
          setItems((p) => [...p, it]);
          setSelectedIds([it.id]);
          setSelectedEdgeIds([]);
          setTool("select");
        };

        probe.src = src;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ---------- pointer ---------- */
  function capture(e: React.PointerEvent) {
    try { boardRef.current?.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }
  function onBoardDown(e: React.PointerEvent<HTMLDivElement>) {
    if (editingId) commitEdit();
    if (e.button === 2) return;
    setContextMenu(null);
    const world = getWorldPoint(e.clientX, e.clientY);
    capture(e);
    if (e.button === 1 || tool === "pan" || spaceRef.current) {
      dragRef.current = { mode: "pan", startScreenX: e.clientX, startScreenY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
      return;
    }
    if (e.button !== 0) return;
    if (tool === "select") {
      if (!e.shiftKey) { setSelectedIds([]); setSelectedEdgeIds([]); }
      dragRef.current = { mode: "marquee", startWorldX: world.x, startWorldY: world.y, curWorldX: world.x, curWorldY: world.y, shift: e.shiftKey, startSelection: e.shiftKey ? [...selectedIds] : [] };
      setMarquee({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
    } else if (tool === "connect") {
      setSelectedIds([]); setSelectedEdgeIds([]);
    } else {
      pushHistory();
      const it = createItem(tool, world.x - 90, world.y - 50);
      setItems((p) => [...p, it]);
      setSelectedIds([it.id]); setSelectedEdgeIds([]);
      setTool("select");
      setTimeout(() => { setEditingId(it.id); setEditingText(it.text); }, 30);
    }
  }
  function onBoardMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (d.mode === "none") return;
    if (d.mode === "pan") {
      setPan({ x: d.startPanX + (e.clientX - d.startScreenX), y: d.startPanY + (e.clientY - d.startScreenY) });
      return;
    }
    if (d.mode === "marquee") {
      const w = getWorldPoint(e.clientX, e.clientY);
      d.curWorldX = w.x; d.curWorldY = w.y;
      setMarquee({ x1: d.startWorldX, y1: d.startWorldY, x2: w.x, y2: w.y });
      const xMin = Math.min(d.startWorldX, w.x), xMax = Math.max(d.startWorldX, w.x);
      const yMin = Math.min(d.startWorldY, w.y), yMax = Math.max(d.startWorldY, w.y);
      const hit = itemsRef.current.filter((it) => it.x < xMax && it.x + it.w > xMin && it.y < yMax && it.y + it.h > yMin).map((it) => it.id);
      if (d.shift) setSelectedIds(Array.from(new Set([...d.startSelection, ...hit])));
      else setSelectedIds(hit);
      return;
    }
    if (d.mode === "node-drag") {
      const dx = (e.clientX - d.startScreenX) / zoomRef.current;
      const dy = (e.clientY - d.startScreenY) / zoomRef.current;
      if (Math.abs(e.clientX - d.startScreenX) + Math.abs(e.clientY - d.startScreenY) > 3) d.moved = true;
      if (!d.moved) return;
      setItems((prev) => prev.map((it) => {
        const o = d.orig.get(it.id);
        return o ? { ...it, x: o.x + dx, y: o.y + dy } : it;
      }));
      return;
    }
    if (d.mode === "resize") {
      const w = getWorldPoint(e.clientX, e.clientY);
      const dx = w.x - d.startWorldX, dy = w.y - d.startWorldY;
      const o = d.orig;
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
      if (d.handle.includes("e")) nw = Math.max(60, o.w + dx);
      if (d.handle.includes("s")) nh = Math.max(40, o.h + dy);
      if (d.handle.includes("w")) { nw = Math.max(60, o.w - dx); nx = o.x + o.w - nw; }
      if (d.handle.includes("n")) { nh = Math.max(40, o.h - dy); ny = o.y + o.h - nh; }
      setItems((prev) => prev.map((it) => (it.id === d.id ? { ...it, x: nx, y: ny, w: nw, h: nh } : it)));
      d.moved = true;
      return;
    }
    if (d.mode === "connect") {
      const w = getWorldPoint(e.clientX, e.clientY);
      const pad = 18 / zoomRef.current;
      const target = itemsRef.current.find((it) => it.id !== d.fromId && w.x >= it.x - pad && w.x <= it.x + it.w + pad && w.y >= it.y - pad && w.y <= it.y + it.h + pad);
      const src = itemsRef.current.find((i) => i.id === d.fromId);
      const p1 = src ? getPortPos(src, d.fromSide) : { x: d.startWorldX, y: d.startWorldY };
      if (target) {
        const side = closestSide(target, w);
        d.hoverId = target.id; d.hoverSide = side;
        const p2 = getPortPos(target, side);
        setConnectPreview({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, targetId: target.id });
      } else {
        d.hoverId = null;
        setConnectPreview({ x1: p1.x, y1: p1.y, x2: w.x, y2: w.y, targetId: null });
      }
    }
  }
  function onBoardUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    try { boardRef.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (d.mode === "none") return;
    if (d.mode === "pan") { dragRef.current = { mode: "none" }; return; }
    if (d.mode === "marquee") {
      const moved = Math.abs(d.curWorldX - d.startWorldX) + Math.abs(d.curWorldY - d.startWorldY);
      if (moved < 6 && !d.shift) { setSelectedIds([]); setSelectedEdgeIds([]); }
      setMarquee(null); dragRef.current = { mode: "none" }; return;
    }
    if (d.mode === "node-drag") {
      if (d.moved) { pastRef.current.push(d.startSnapshot); futureRef.current = []; bumpHist((v) => v + 1); setDirty(true); }
      dragRef.current = { mode: "none" }; return;
    }
    if (d.mode === "resize") {
      if (d.moved) { pastRef.current.push(d.startSnapshot); futureRef.current = []; bumpHist((v) => v + 1); setDirty(true); }
      dragRef.current = { mode: "none" }; return;
    }
    if (d.mode === "connect") {
      // Пересчитываем цель по точке отпускания — надёжнее, чем только hover
      const w = getWorldPoint(e.clientX, e.clientY);
      const pad = 18 / zoomRef.current;
      const target = itemsRef.current.find((it) =>
        it.id !== d.fromId &&
        w.x >= it.x - pad && w.x <= it.x + it.w + pad &&
        w.y >= it.y - pad && w.y <= it.y + it.h + pad
      );
      const toId = target ? target.id : d.hoverId;
      if (toId) {
        const toSide = target ? closestSide(target, w) : d.hoverSide;
        const exists = connsRef.current.some((c) => c.from === d.fromId && c.to === toId && c.fromSide === d.fromSide && c.toSide === toSide);
        if (!exists) {
          pushHistory();
          setConns((prev) => [...prev, { id: uuid(), from: d.fromId, to: toId, fromSide: d.fromSide, toSide }]);
        }
      }
      setConnectPreview(null);
      dragRef.current = { mode: "none" };
    }
  }
  function onNodeDown(e: React.PointerEvent, id: string) {
    if (editingId === id) return;
    if (editingId) commitEdit();
    if (e.button === 2) return;
    e.stopPropagation();
    setContextMenu(null);
    capture(e);
    if (tool === "pan" || spaceRef.current || e.button === 1) {
      dragRef.current = { mode: "pan", startScreenX: e.clientX, startScreenY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y };
      return;
    }
    if (tool === "connect") {
      const w = getWorldPoint(e.clientX, e.clientY);
      const it = itemsRef.current.find((i) => i.id === id);
      if (!it) return;
      const side = closestSide(it, w);
      const p = getPortPos(it, side);
      dragRef.current = { mode: "connect", fromId: id, fromSide: side, startWorldX: p.x, startWorldY: p.y, hoverId: null, hoverSide: "left" };
      setConnectPreview({ x1: p.x, y1: p.y, x2: w.x, y2: w.y, targetId: null });
      return;
    }
    if (tool !== "select") return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) { setSelectedIds((p) => p.filter((s) => s !== id)); dragRef.current = { mode: "none" }; return; }
      const next = [...selectedIds, id];
      setSelectedIds(next); setSelectedEdgeIds([]);
      const orig = new Map<string, { x: number; y: number }>();
      next.forEach((sid) => { const it = itemsRef.current.find((i) => i.id === sid); if (it) orig.set(sid, { x: it.x, y: it.y }); });
      dragRef.current = { mode: "node-drag", startScreenX: e.clientX, startScreenY: e.clientY, orig, moved: false, startSnapshot: snapshotNow() };
      return;
    }
    const next = selectedIds.includes(id) ? [...selectedIds] : [id];
    if (!selectedIds.includes(id)) { setSelectedIds([id]); setSelectedEdgeIds([]); }
    const orig = new Map<string, { x: number; y: number }>();
    next.forEach((sid) => { const it = itemsRef.current.find((i) => i.id === sid); if (it) orig.set(sid, { x: it.x, y: it.y }); });
    dragRef.current = { mode: "node-drag", startScreenX: e.clientX, startScreenY: e.clientY, orig, moved: false, startSnapshot: snapshotNow() };
  }
  function onPortDown(e: React.PointerEvent, id: string, side: Side) {
    e.stopPropagation();
    capture(e);
    if (editingId) commitEdit();
    const it = itemsRef.current.find((i) => i.id === id);
    if (!it) return;
    const p = getPortPos(it, side);
    const w = getWorldPoint(e.clientX, e.clientY);
    dragRef.current = { mode: "connect", fromId: id, fromSide: side, startWorldX: p.x, startWorldY: p.y, hoverId: null, hoverSide: "left" };
    setConnectPreview({ x1: p.x, y1: p.y, x2: w.x, y2: w.y, targetId: null });
  }
  function onResizeDown(e: React.PointerEvent, id: string, handle: string) {
    e.stopPropagation();
    capture(e);
    const w = getWorldPoint(e.clientX, e.clientY);
    const it = itemsRef.current.find((i) => i.id === id);
    if (!it) return;
    dragRef.current = { mode: "resize", id, handle, startWorldX: w.x, startWorldY: w.y, orig: { ...it }, moved: false, startSnapshot: snapshotNow() };
  }
  function onEdgeDown(e: React.PointerEvent, edgeId: string) {
    e.stopPropagation();
    capture(e);
    if (e.shiftKey) setSelectedEdgeIds((p) => (p.includes(edgeId) ? p.filter((x) => x !== edgeId) : [...p, edgeId]));
    else { setSelectedEdgeIds([edgeId]); setSelectedIds([]); }
  }

  /* ---------- рендер узла ---------- */
  function nodeStyle(it: BoardItem): React.CSSProperties {
    const selected = selectedIds.includes(it.id);
    const base: React.CSSProperties = {
      position: "absolute",
      left: it.x, top: it.y, width: it.w, height: it.h,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: it.type === "text" ? 6 : 12,
      fontSize: it.fontSize, lineHeight: 1.35,
      fontWeight: it.type === "text" ? 700 : 500,
      textAlign: "center", whiteSpace: "pre-wrap", wordBreak: "break-word",
      userSelect: "none", cursor: tool === "pan" || spaceDown ? "grab" : "move",
      touchAction: "none",
    };
    if (it.type === "image") {
      return {
        ...base,
        padding: 0,
        overflow: "hidden",
        background: "rgba(10,14,20,.5)",
        borderRadius: 8,
        boxShadow: selected
          ? "0 0 0 2.5px #38e8ff, 0 12px 32px -10px rgba(0,0,0,.6)"
          : "0 10px 26px -10px rgba(0,0,0,.6)",
      };
    }
    if (it.type === "sticky") {
      return { ...base, background: it.color, color: "#1a1508", borderRadius: 8, boxShadow: selected ? "0 0 0 2.5px #38e8ff, 0 12px 32px -10px rgba(0,0,0,.6)" : "0 10px 26px -10px rgba(0,0,0,.6)" };
    }
    if (it.type === "text") {
      return { ...base, background: selected ? "rgba(56,232,255,.08)" : "transparent", color: it.color, borderRadius: 6, textShadow: "0 2px 10px rgba(0,0,0,.7)", outline: selected ? "2px dashed rgba(56,232,255,.7)" : "2px dashed transparent" };
    }
    if (it.type === "ellipse") {
      return { ...base, background: "rgba(10,14,20,.94)", color: "#e6edf3", border: `2.5px solid ${it.color}`, borderRadius: 999, boxShadow: selected ? "0 0 0 2.5px #38e8ff" : "0 8px 26px -12px rgba(0,0,0,.7)" };
    }
    return { ...base, background: "rgba(10,14,20,.94)", color: "#e6edf3", border: `2.5px solid ${it.color}`, borderRadius: 12, boxShadow: selected ? "0 0 0 2.5px #38e8ff" : "0 8px 26px -12px rgba(0,0,0,.7)" };
  }

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-slate-500" style={{ background: "#070a0f" }}>Загрузка доски...</div>;
  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500" style={{ background: "#070a0f" }}>
        <p>Доска не найдена</p>
        <button onClick={goBack} className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:text-slate-200">Назад</button>
      </div>
    );
  }

  const grid = 26 * zoom;
  const cursor = tool === "pan" || spaceDown ? "grab" : tool === "select" ? "default" : "crosshair";
  const marqueeScreen = marquee ? {
    left: Math.min(marquee.x1, marquee.x2) * zoom + pan.x,
    top: Math.min(marquee.y1, marquee.y2) * zoom + pan.y,
    width: Math.abs(marquee.x2 - marquee.x1) * zoom,
    height: Math.abs(marquee.y2 - marquee.y1) * zoom,
  } : null;

  const tools: { id: Tool; icon: typeof Square; hint: string }[] = [
    { id: "select", icon: MousePointer2, hint: "Выбор (V)" },
    { id: "pan", icon: Hand, hint: "Рука (H)" },
    { id: "sticky", icon: StickyNote, hint: "Стикер (S)" },
    { id: "text", icon: Type, hint: "Текст (T)" },
    { id: "rect", icon: Square, hint: "Прямоугольник (R)" },
    { id: "ellipse", icon: Circle, hint: "Овал (O)" },
    { id: "connect", icon: Share2, hint: "Связь (C)" },
  ];

  return (
    <div className="flex h-full flex-col" style={{ background: "#070a0f" }}>
      {/* верхняя панель */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#0a0e14] px-3 py-2">
        <button onClick={() => { if (dirty) saveBoard(false); goBack(); }} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-100">
          <ArrowLeft size={12} /> Назад
        </button>
        <span className="text-sm font-semibold text-slate-100">{doc.name}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-amber-400" : "bg-emerald-500"}`} title={dirty ? "Есть несохранённые изменения" : "Сохранено"} />
        <div className="mx-1 h-4 w-px bg-white/10" />
        <button onClick={undo} disabled={pastRef.current.length === 0} title="Отменить (Ctrl+Z)" className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100 disabled:opacity-30"><Undo2 size={14} /></button>
        <button onClick={redo} disabled={futureRef.current.length === 0} title="Вернуть (Ctrl+Y)" className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100 disabled:opacity-30"><Redo2 size={14} /></button>
        <button onClick={duplicateSelected} disabled={selectedIds.length === 0} title="Дублировать (Ctrl+D)" className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100 disabled:opacity-30"><Copy size={14} /></button>
        <button onClick={deleteSelected} disabled={selectedIds.length === 0 && selectedEdgeIds.length === 0} title="Удалить (Del)" className="rounded p-1.5 text-slate-400 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-30"><Trash2 size={14} /></button>
        {singleSelected && (
          <>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => { pushHistory(); setItems((p) => p.map((i) => (i.id === singleSelected.id ? { ...i, color: c } : i))); }} style={{ background: c }} className={`h-4 w-4 rounded-full border ${singleSelected.color === c ? "border-white" : "border-white/20"}`} />
              ))}
            </div>
            <button onClick={() => { pushHistory(); setItems((p) => p.map((i) => (i.id === singleSelected.id ? { ...i, fontSize: Math.max(10, i.fontSize - 2) } : i))); }} title="Шрифт меньше" className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-white/5">A-</button>
            <button onClick={() => { pushHistory(); setItems((p) => p.map((i) => (i.id === singleSelected.id ? { ...i, fontSize: Math.min(64, i.fontSize + 2) } : i))); }} title="Шрифт больше" className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-white/5">A+</button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{Math.round(zoom * 100)}%</span>
          <label className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500">
            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="accent-cyan-400" /> автосейв
          </label>
          <button onClick={() => saveBoard(true)} className="flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-400/20">
            <Save size={12} /> Сохранить
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* левый тулбар */}
        <div className="flex w-11 flex-col items-center gap-1 border-r border-white/5 bg-[#0a0e14] py-2">
          {tools.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.hint} className={`rounded-lg p-2 transition ${tool === t.id ? "bg-cyan-400/15 text-cyan-300 shadow-[0_0_12px_-2px_rgba(56,232,255,.5)]" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>
              <t.icon size={16} />
            </button>
          ))}
          <div className="my-1 h-px w-6 bg-white/10" />
          <button onClick={addImageFromFile} title="Изображение" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200">
            <ImageIcon size={16} />
          </button>
        </div>

        {/* холст */}
        <div
          ref={boardRef}
          className="miro-board relative min-h-0 flex-1 overflow-hidden"
          style={{
            cursor,
            backgroundColor: "#070a0f",
            backgroundImage: "radial-gradient(rgba(56,232,255,.14) 1px, transparent 1px)",
            backgroundSize: `${grid}px ${grid}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onPointerDown={onBoardDown}
          onPointerMove={onBoardMove}
          onPointerUp={onBoardUp}
          onPointerCancel={onBoardUp}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
        >
          {/* мир */}
          <div className="absolute left-0 top-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: 10, height: 10 }}>
            {/* SVG связей: строго в (0,0) мира, иначе линии уезжают за экран */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: 10, height: 10, overflow: "visible", pointerEvents: "none" }}>
              <defs>
                <marker id="miro-arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L0,8 L9,4 z" fill="rgba(56,232,255,.75)" />
                </marker>
                <marker id="miro-arrow-sel" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M0,0 L0,8 L9,4 z" fill="#fbbf24" />
                </marker>
              </defs>
              {conns.map((c) => {
                const a = items.find((i) => i.id === c.from);
                const b = items.find((i) => i.id === c.to);
                if (!a || !b) return null;
                const p1 = getPortPos(a, c.fromSide);
                const p2 = getPortPos(b, c.toSide);
                const d = bezierPath(p1.x, p1.y, p2.x, p2.y, c.fromSide, c.toSide);
                const sel = selectedEdgeIds.includes(c.id);
                return (
                  <g key={c.id}>
                    <path d={d} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onPointerDown={(e) => onEdgeDown(e, c.id)}
                      onDoubleClick={(e) => { e.stopPropagation(); pushHistory(); setConns((p) => p.filter((x) => x.id !== c.id)); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdgeIds([c.id]); setSelectedIds([]); setContextMenu({ x: e.clientX, y: e.clientY, edgeId: c.id }); }}
                    />
                    <path d={d} fill="none" stroke={sel ? "#fbbf24" : "rgba(56,232,255,.65)"} strokeWidth={sel ? 3 : 2} markerEnd={sel ? "url(#miro-arrow-sel)" : "url(#miro-arrow)"} style={{ pointerEvents: "none" }} />
                  </g>
                );
              })}
              {connectPreview && (
                <path d={`M ${connectPreview.x1} ${connectPreview.y1} L ${connectPreview.x2} ${connectPreview.y2}`} fill="none" stroke="#38e8ff" strokeWidth={2 / zoom} strokeDasharray="6 5" style={{ pointerEvents: "none" }} />
              )}
            </svg>

            {items.map((it) => {
              const selected = selectedIds.includes(it.id);
              const showPorts = selected || hoveredId === it.id || !!connectPreview;
              const isTarget = connectPreview?.targetId === it.id;
              return (
                <div
                  key={it.id}
                  className="miro-node"
                  style={{ ...nodeStyle(it), outline: isTarget ? "3px solid #34d399" : undefined, outlineOffset: 3 }}
                  onPointerDown={(e) => onNodeDown(e, it.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); if (tool === "select" && it.type !== "image") { setEditingId(it.id); setEditingText(it.text); } }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!selectedIds.includes(it.id) && !e.shiftKey) { setSelectedIds([it.id]); setSelectedEdgeIds([]); } setContextMenu({ x: e.clientX, y: e.clientY, nodeId: it.id }); }}
                  onPointerEnter={() => setHoveredId(it.id)}
                  onPointerLeave={() => setHoveredId(null)}
                >
                  {editingId === it.id ? (
                    <textarea
                      ref={editRef}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={commitEdit}
                      onPointerDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") commitEdit(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitEdit(); }}
                      className="miro-edit"
                      style={{ fontSize: it.fontSize, color: it.type === "sticky" ? "#1a1508" : it.type === "text" ? it.color : "#e6edf3" }}
                    />
                  ) : it.type === "image" ? (
                    it.src ? (
                      <img
                        src={it.src}
                        draggable={false}
                        style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none", display: "block" }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#64748b", fontSize: 12 }}>Нет изображения</div>
                    )
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{it.text}</div>
                  )}

                  {/* порты связей — инлайн стили, работают без CSS */}
                  {showPorts && editingId !== it.id && (["top", "right", "bottom", "left"] as Side[]).map((s) => (
                    <div key={s} style={portStyle(s, zoom)} onPointerDown={(e) => onPortDown(e, it.id, s)} />
                  ))}

                  {/* ручки ресайза — инлайн стили, работают без CSS */}
                  {selected && selectedIds.length === 1 && editingId !== it.id && ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => (
                    <div key={h} style={resizeHandleStyle(h, zoom)} onPointerDown={(e) => onResizeDown(e, it.id, h)} />
                  ))}
                </div>
              );
            })}
          </div>

          {items.length === 0 && !loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-xs rounded-xl border border-white/10 bg-black/50 p-5 text-center backdrop-blur">
                <p className="mb-1 text-sm font-medium text-slate-200">Пустая доска</p>
                <p className="text-[11px] leading-relaxed text-slate-500">Правая кнопка — создать элемент<br />Или выберите инструмент слева<br />Ctrl+колесо — масштаб</p>
              </div>
            </div>
          )}

          {marqueeScreen && (
            <div className="pointer-events-none absolute border border-cyan-400/70 bg-cyan-400/10" style={{ left: marqueeScreen.left, top: marqueeScreen.top, width: marqueeScreen.width, height: marqueeScreen.height }} />
          )}

          {/* контекстное меню */}
          {contextMenu && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 240 }} onPointerDown={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
              <div className="glass-panel glow-border fixed w-52 rounded-lg p-1.5 shadow-2xl" style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 300), zIndex: 250 }}
                onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
                {contextMenu.edgeId ? (
                  <button onClick={() => { pushHistory(); setConns((p) => p.filter((c) => c.id !== contextMenu.edgeId)); setSelectedEdgeIds([]); setContextMenu(null); }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-400/10">
                    <Trash2 size={14} /> Удалить связь
                  </button>
                ) : contextMenu.nodeId ? (
                  <>
                    <button onClick={() => { const it = items.find((i) => i.id === contextMenu.nodeId); if (it) { setEditingId(it.id); setEditingText(it.text); } setContextMenu(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5"><Pencil size={14} className="text-cyan-300" /> Редактировать</button>
                    <button onClick={() => { const id = contextMenu.nodeId!; setSelectedIds([id]); setTimeout(duplicateSelected, 0); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5"><Copy size={14} className="text-cyan-300" /> Дублировать</button>
                    <div className="mx-1 my-1 flex gap-1.5 p-1">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => { pushHistory(); setItems((p) => p.map((i) => (i.id === contextMenu.nodeId ? { ...i, color: c } : i))); setContextMenu(null); }}
                          style={{ background: c }} className="h-5 w-5 rounded-full border border-white/20 hover:scale-110" />
                      ))}
                    </div>
                    <div className="mx-1 mb-1 grid grid-cols-4 gap-1 p-1">
                      {(["sticky", "text", "rect", "ellipse"] as BoardType[]).map((t) => (
                        <button key={t} title={t} onClick={() => { pushHistory(); setItems((p) => p.map((i) => (i.id === contextMenu.nodeId ? { ...i, type: t, fontSize: t === "text" && i.fontSize < 18 ? 22 : i.fontSize } : i))); setContextMenu(null); }}
                          className="rounded border border-white/10 p-1.5 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300">
                          {t === "sticky" ? <StickyNote size={13} /> : t === "text" ? <Type size={13} /> : t === "rect" ? <Square size={13} /> : <Circle size={13} />}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { const id = contextMenu.nodeId!; pushHistory(); setItems((p) => { const it = p.find((x) => x.id === id); return it ? [...p.filter((x) => x.id !== id), it] : p; }); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5"><ChevronsUp size={14} className="text-cyan-300" /> На передний план</button>
                    <button onClick={() => { const id = contextMenu.nodeId!; pushHistory(); setItems((p) => { const it = p.find((x) => x.id === id); return it ? [it, ...p.filter((x) => x.id !== id)] : p; }); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5"><ChevronsDown size={14} className="text-cyan-300" /> На задний план</button>
                    <div className="my-1 border-t border-white/10" />
                    <button onClick={deleteSelected} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-400/10"><Trash2 size={14} /> Удалить</button>
                  </>
                ) : (
                  <>
                    {(["sticky", "text", "rect", "ellipse"] as BoardType[]).map((t) => (
                      <button key={t} onClick={() => {
                        const w = getWorldPoint(contextMenu.x, contextMenu.y);
                        pushHistory();
                        const it = createItem(t, w.x - 90, w.y - 50);
                        setItems((p) => [...p, it]); setSelectedIds([it.id]); setContextMenu(null);
                      }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5">
                        {t === "sticky" ? <StickyNote size={14} className="text-cyan-300" /> : t === "text" ? <Type size={14} className="text-cyan-300" /> : t === "rect" ? <Square size={14} className="text-cyan-300" /> : <Circle size={14} className="text-cyan-300" />}
                        {t === "sticky" ? "Стикер" : t === "text" ? "Текст" : t === "rect" ? "Прямоугольник" : "Овал"}
                      </button>
                    ))}
                    <button onClick={() => {
                      const w = getWorldPoint(contextMenu.x, contextMenu.y);
                      setContextMenu(null);
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const src = String(reader.result);
                          const probe = new window.Image();
                          probe.onload = () => {
                            const maxDim = 340;
                            let iw = probe.naturalWidth || 240;
                            let ih = probe.naturalHeight || 160;
                            const scale = Math.min(1, maxDim / Math.max(iw, ih));
                            iw = Math.round(iw * scale);
                            ih = Math.round(ih * scale);
                            pushHistory();
                            const it: BoardItem = {
                              id: uuid(),
                              x: w.x - iw / 2,
                              y: w.y - ih / 2,
                              w: iw,
                              h: ih,
                              type: "image",
                              color: "#38bdf8",
                              text: "",
                              fontSize: 14,
                              src,
                            };
                            setItems((p) => [...p, it]);
                            setSelectedIds([it.id]);
                          };
                          probe.src = src;
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5">
                      <ImageIcon size={14} className="text-cyan-300" />
                      Изображение
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button onClick={() => { fitView(); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-white/5"><Maximize size={14} className="text-cyan-300" /> Вписать в экран</button>
                    <button onClick={() => { saveBoard(true); setContextMenu(null); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"><Save size={14} /> Сохранить</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}