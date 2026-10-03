import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FolderOpen,
  Save,
  Eye,
  Code2,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import { findFileByPath, formatBytes, KIND_LABEL } from "../utils/vault";
import { FileIcon } from "../components/FileIcon";
import { MarkdownView } from "../components/MarkdownView";

export default function FileViewerPage({ path }: { path: string }) {
  const app = useDashboardStore((s) => s.app);
  const vault = useDashboardStore((s) => s.vault);
  const goBack = useDashboardStore((s) => s.goBack);
  const loadFileContent = useDashboardStore((s) => s.loadFileContent);
  const updateFileContent = useDashboardStore((s) => s.updateFileContent);
  const revealInExplorer = useDashboardStore((s) => s.revealInExplorer);
  const openInObsidian = useDashboardStore((s) => s.openInObsidian);
  const launchProgram = useDashboardStore((s) => s.launchProgram);
  const pushToast = useDashboardStore((s) => s.pushToast);

  const file = findFileByPath(vault, path);

  const [mode, setMode] = useState<"preview" | "raw">("preview");
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Состояния для изображений
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  // Состояния для PDF (новое)
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // Сбрасываем старые URL при смене файла
    setImageUrl("");
    setImageError(false);
    setPdfUrl("");
    setPdfError(false);

    if (!file) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Если это изображение — получаем его локальный URL через API Obsidian
    if (file.kind === "image") {
      const abstractFile = app?.vault.getAbstractFileByPath(path);
      if (abstractFile && app) {
        try {
          const url = app.vault.getResourcePath(abstractFile as any);
          setImageUrl(url);
        } catch {
          setImageError(true);
        }
      } else {
        setImageError(true);
      }
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Если это PDF — получаем его локальный URL для отображения в iframe (новое)
    if (file.kind === "pdf") {
      const abstractFile = app?.vault.getAbstractFileByPath(path);
      if (abstractFile && app) {
        try {
          const url = app.vault.getResourcePath(abstractFile as any);
          setPdfUrl(url);
        } catch {
          setPdfError(true);
        }
      } else {
        setPdfError(true);
      }
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (file.kind === "executable") {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    loadFileContent(path).then((content) => {
      if (!cancelled) {
        setDraft(content);
        setDirty(false);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path, file?.kind, app]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <p className="mb-3">Файл не найден</p>
        <button
          onClick={goBack}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:border-cyan-400/30"
        >
          Назад
        </button>
      </div>
    );
  }

  async function save() {
    await updateFileContent(path, draft);
    setDirty(false);
    pushToast("success", "Сохранено", file?.name ?? path);
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-400/30 hover:text-slate-200"
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <FileIcon kind={file.kind} className="h-5 w-5" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-100">{file.name}</h1>
            <p className="truncate font-mono-techno text-[11px] text-slate-500">{file.path}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
          {KIND_LABEL[file.kind]} · {formatBytes(file.size)}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {file.kind === "markdown" && (
          <div className="flex overflow-hidden rounded-md border border-white/10">
            <button
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                mode === "preview" ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <Eye size={13} /> Просмотр
            </button>
            <button
              onClick={() => setMode("raw")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                mode === "raw" ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <Code2 size={13} /> Markdown
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {(file.kind === "markdown" || file.kind === "text") && dirty && (
            <button
              onClick={save}
              className="flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/25"
            >
              <Save size={13} /> Сохранить
            </button>
          )}
          {file.kind === "executable" && (
            <button
              onClick={() => launchProgram(file)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/25"
            >
              <PlayCircle size={13} /> Запустить
            </button>
          )}
          {(file.kind === "markdown" || file.kind === "pdf" || file.kind === "image") && (
            <button
              onClick={() => openInObsidian(file)}
              className="flex items-center gap-1.5 rounded-md border border-violet-400/20 bg-violet-400/5 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-400/15"
            >
              <ExternalLink size={13} /> Открыть в Obsidian
            </button>
          )}
          <button
            onClick={() => revealInExplorer(file)}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/30"
          >
            <FolderOpen size={13} /> Открыть папку
          </button>
        </div>
      </div>

      <div className="glass-panel min-h-0 flex-1 overflow-hidden rounded-xl">
        {loading && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Загрузка...
          </div>
        )}

        {!loading && file.kind === "markdown" && mode === "preview" && (
          <div className="h-full overflow-y-auto p-6">
            <MarkdownView content={draft || "_Пустая заметка_"} />
          </div>
        )}

        {!loading && ((file.kind === "markdown" && mode === "raw") || file.kind === "text") && (
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent p-6 font-mono-techno text-sm leading-relaxed text-slate-200 focus:outline-none"
          />
        )}

        {/* Просмотр изображения прямо в дашборде */}
        {!loading && file.kind === "image" && (
          <div className="flex h-full w-full items-center justify-center overflow-auto bg-black/20 p-4">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={file.name}
                onError={() => setImageError(true)}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl shadow-black/50"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <FileIcon kind="image" className="h-12 w-12" />
                <p className="text-sm">Не удалось загрузить изображение</p>
                <button
                  onClick={() => revealInExplorer(file)}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/30"
                >
                  <FolderOpen size={13} /> Открыть папку
                </button>
              </div>
            )}
          </div>
        )}

        {/* Просмотр PDF (Обновлено) */}
        {!loading && file.kind === "pdf" && (
          <div className="h-full w-full bg-zinc-900/40">
            {pdfUrl && !pdfError ? (
              <iframe
                src={pdfUrl}
                title={file.name}
                className="h-full w-full border-none"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                <FileIcon kind="pdf" className="h-12 w-12" />
                <p className="max-w-sm text-center text-sm">
                  Не удалось загрузить PDF во встроенном просмотрщике.
                </p>
                <button
                  onClick={() => openInObsidian(file)}
                  className="flex items-center gap-1.5 rounded-md bg-violet-400/15 px-3.5 py-2 text-xs font-medium text-violet-300 hover:bg-violet-400/25"
                >
                  <ExternalLink size={13} /> Открыть PDF в Obsidian
                </button>
              </div>
            )}
          </div>
        )}

        {file.kind === "executable" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <FileIcon kind="executable" className="h-12 w-12" />
            <p className="max-w-sm text-center text-sm">
              Исполняемый файл. Просмотр содержимого недоступен — запустите программу или откройте папку с файлом.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}