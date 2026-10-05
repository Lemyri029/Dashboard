import { useEffect, useRef, useState } from "react";
import {
  Settings2,
  RefreshCw,
  Palette,
  Trash2,
  Image as ImageIcon,
  FolderOpen,
  Upload,
  RotateCcw,
  Download,
  DatabaseBackup,
  Globe,
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import {
  resolveBackgroundUrl,
  saveBackgroundFile,
  ImageSuggestModal,
} from "../utils/background";
import { type DashboardTheme } from "../utils/themes";
import { THEMES_FOLDER, createThemeTemplate } from "../utils/themeLoader";
import { t, LANGUAGES } from "../i18n";

/* ---------- Toggle ---------- */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${
        checked ? "bg-cyan-400/70" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ---------- Язык ---------- */

function LanguageSection() {
  const language = useDashboardStore((s) => s.language);
  const setLanguage = useDashboardStore((s) => s.setLanguage);

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Globe size={15} className="text-amber-300" />{" "}
        {t("settings.language.title", language)}
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.language.description", language)}
      </p>
      <div className="flex gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
              language === lang.id
                ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
                : "bg-white/10 text-slate-400 hover:bg-white/20"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Логотип ---------- */

function LogoSection() {
  const customLogo = useDashboardStore((s) => s.customLogo);
  const setCustomLogo = useDashboardStore((s) => s.setCustomLogo);
  const clearCustomLogo = useDashboardStore((s) => s.clearCustomLogo);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const language = useDashboardStore((s) => s.language);

  const logoInputRef = useRef<HTMLInputElement>(null);

  async function onUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      pushToast(
        "error",
        t("settings.logo.unsupportedFormat", language),
        t("settings.logo.unsupportedFormatDesc", language)
      );
      return;
    }

    const MAX_SIZE = 1024 * 1024;
    if (file.size > MAX_SIZE) {
      pushToast(
        "error",
        t("settings.logo.tooLarge", language),
        t("settings.logo.tooLargeDesc", language)
      );
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setCustomLogo(base64);
      pushToast("success", t("settings.logo.resetToastTitle", language), file.name);
    } catch (err) {
      pushToast(
        "error",
        t("settings.logo.uploadFailed", language),
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <ImageIcon size={15} className="text-cyan-300" />{" "}
        {t("settings.logo.title", language)}
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.logo.description", language)}
      </p>

      <div className="mb-3 flex h-[120px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3">
        {customLogo ? (
          <img
            src={customLogo}
            alt={t("settings.logo.alt", language)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-slate-500">
            {t("settings.logo.defaultLogo", language)}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => logoInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Upload size={13} /> {t("settings.logo.upload", language)}
        </button>

        {customLogo && (
          <button
            onClick={() => {
              clearCustomLogo();
              pushToast(
                "info",
                t("settings.logo.resetToastTitle", language),
                t("settings.logo.resetToastMessage", language)
              );
            }}
            className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-400/15"
          >
            <RotateCcw size={13} /> {t("settings.logo.reset", language)}
          </button>
        )}

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          hidden
          onChange={onUploadLogo}
        />
      </div>

      <div className="rounded-md bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
        <p className="mb-1 font-medium text-slate-300">
          {t("settings.logo.requirements", language)}
        </p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>
            <span className="text-slate-300">
              {t("settings.logo.formats", language)}
            </span>
          </li>
          <li>
            <span className="text-slate-300">
              {t("settings.logo.size", language)}
            </span>
          </li>
          <li>
            <span className="text-slate-300">
              {t("settings.logo.maxSize", language)}
            </span>
          </li>
          <li>
            <span className="text-slate-300">
              {t("settings.logo.transparency", language)}
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ---------- Фон ---------- */

function BackgroundSection() {
  const app = useDashboardStore((s) => s.app);
  const background = useDashboardStore((s) => s.background);
  const setBackground = useDashboardStore((s) => s.setBackground);
  const resetBackground = useDashboardStore((s) => s.resetBackground);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const refreshVault = useDashboardStore((s) => s.refreshVault);
  const language = useDashboardStore((s) => s.language);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState(background.imageUrl ?? "");

  useEffect(() => {
    setUrlDraft(background.imageUrl ?? "");
  }, [background.imageUrl]);

  const previewUrl = resolveBackgroundUrl(app, background);
  const activeSource = background.imagePath ?? background.imageUrl;

  function pickFromVault() {
    if (!app) {
      pushToast("error", t("settings.background.obsidianNotConnected", language));
      return;
    }
    new ImageSuggestModal(app, (file) => {
      setBackground({
        imagePath: file.path,
        imageUrl: null,
        enabled: true,
      });
      setUrlDraft("");
      pushToast("success", t("settings.background.setFromVault", language), file.path);
    }).open();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!app) return pushToast("error", t("settings.background.obsidianNotConnected", language));
    try {
      const path = await saveBackgroundFile(app, file);
      setBackground({ imagePath: path, imageUrl: null, enabled: true });
      setUrlDraft("");
      refreshVault();
      pushToast("success", t("settings.background.setFromDisk", language), path);
    } catch (err) {
      pushToast(
        "error",
        t("settings.background.uploadFailed", language),
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function applyUrl() {
    const url = urlDraft.trim();
    setBackground({
      imageUrl: url || null,
      imagePath: url ? null : background.imagePath,
      enabled: true,
    });
    if (url) pushToast("success", t("settings.background.setFromUrl", language));
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <ImageIcon size={15} className="text-emerald-300" />{" "}
          {t("settings.background.title", language)}
        </h2>
        <Toggle
          checked={background.enabled}
          onChange={(v) => setBackground({ enabled: v })}
        />
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.background.description", language)}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={pickFromVault}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <FolderOpen size={13} /> {t("settings.background.fromVault", language)}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Upload size={13} /> {t("settings.background.fromDisk", language)}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onUpload} />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-[11px] text-slate-500">
          {t("settings.background.externalUrl", language)}
        </label>
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyUrl()}
            onBlur={applyUrl}
            placeholder="https://..."
            className="flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{t("settings.background.dim", language)}</span>
        <span className="text-cyan-300">{Math.round(background.dim * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={background.dim}
        onChange={(e) => setBackground({ dim: Number(e.target.value) })}
        className="mb-3 w-full accent-cyan-400"
      />

      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{t("settings.background.blur", language)}</span>
        <span className="text-cyan-300">{background.blur}px</span>
      </div>
      <input
        type="range"
        min={0}
        max={30}
        step={1}
        value={background.blur}
        onChange={(e) => setBackground({ blur: Number(e.target.value) })}
        className="mb-3 w-full accent-cyan-400"
      />

      {previewUrl && (
        <div className="relative mb-3 h-28 overflow-hidden rounded-lg ring-1 ring-white/10">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${previewUrl}")`,
              filter: background.blur ? `blur(${background.blur}px)` : undefined,
              transform: background.blur ? "scale(1.05)" : undefined,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "var(--background-primary)",
              opacity: background.dim,
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="max-w-[60%] truncate text-[11px] text-slate-500">
          {activeSource
            ? t("settings.background.source", language, { source: activeSource })
            : t("settings.background.noSource", language)}
        </span>
        <button
          onClick={() => {
            resetBackground();
            setUrlDraft("");
          }}
          className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-400/15"
        >
          <RotateCcw size={12} /> {t("settings.background.reset", language)}
        </button>
      </div>
    </section>
  );
}

/* ---------- Тема ---------- */

function ThemeCard({
  item,
  selected,
  onSelect,
}: {
  item: DashboardTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={item.source ?? item.id}
      className={`rounded-xl p-2.5 text-left transition ring-1 ${
        selected
          ? "bg-cyan-400/10 ring-cyan-400/50"
          : "bg-white/[0.02] ring-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <div className="mb-2 flex h-10 overflow-hidden rounded-md">
        {item.preview.map((color, i) => (
          <span key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="truncate text-[11px] font-medium text-slate-200">{item.label}</div>
      <div className="mt-0.5 truncate text-[10px] text-slate-500">{item.description}</div>
    </button>
  );
}

function ThemeSection() {
  const app = useDashboardStore((s) => s.app);
  const theme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);
  const customThemes = useDashboardStore((s) => s.customThemes);
  const themesLoading = useDashboardStore((s) => s.themesLoading);
  const reloadThemes = useDashboardStore((s) => s.reloadThemes);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const refreshVault = useDashboardStore((s) => s.refreshVault);
  const language = useDashboardStore((s) => s.language);

  async function handleReload() {
    await reloadThemes();
    const count = useDashboardStore.getState().customThemes.length;
    pushToast("success", t("settings.theme.reloaded", language, { count }));
  }

  async function handleTemplate() {
    if (!app) return pushToast("error", t("settings.theme.obsidianError", language));
    try {
      const path = await createThemeTemplate(app);
      await reloadThemes();
      refreshVault();
      pushToast("success", t("settings.theme.templateCreated", language), path);
    } catch (e) {
      pushToast(
        "error",
        t("settings.theme.templateFailed", language),
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Palette size={15} className="text-violet-300" />{" "}
        {t("settings.theme.title", language)}
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.theme.description", language, { folder: THEMES_FOLDER })}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handleReload}
          disabled={themesLoading}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25 disabled:opacity-50"
        >
          <RefreshCw size={13} className={themesLoading ? "animate-spin" : ""} />{" "}
          {t("settings.theme.reload", language)}
        </button>
        <button
          onClick={handleTemplate}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <FolderOpen size={13} /> {t("settings.theme.createTemplate", language)}
        </button>
      </div>

      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        {t("settings.theme.custom", language, { count: customThemes.length })}
      </div>
      {customThemes.length === 0 ? (
        <div className="rounded-md bg-white/[0.02] px-3 py-3 text-[11px] text-slate-500">
          {t("settings.theme.empty", language, { folder: THEMES_FOLDER })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {customThemes.map((item) => (
            <ThemeCard
              key={item.source ?? item.id}
              item={item}
              selected={theme === item.id}
              onSelect={() => setTheme(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Бэкап ---------- */

function BackupSection() {
  const downloadBackup = useDashboardStore((s) => s.downloadBackup);
  const importBackupFromFile = useDashboardStore((s) => s.importBackupFromFile);
  const blocks = useDashboardStore((s) => s.blocks);
  const boards = useDashboardStore((s) => s.boards);
  const language = useDashboardStore((s) => s.language);

  const backupInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPickBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ok = confirm(t("settings.backup.confirm", language));
    if (!ok) return;

    setBusy(true);
    try {
      await importBackupFromFile(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <DatabaseBackup size={15} className="text-amber-300" />{" "}
        {t("settings.backup.title", language)}
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.backup.description", language)}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={downloadBackup}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Download size={13} /> {t("settings.backup.save", language)}
        </button>

        <button
          onClick={() => backupInputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/25 disabled:opacity-50"
        >
          <Upload size={13} /> {t("settings.backup.load", language)}
        </button>

        <input
          ref={backupInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onPickBackup}
        />
      </div>

      <div className="rounded-md bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
        <p className="mb-1 font-medium text-slate-300">
          {t("settings.backup.includes", language)}
        </p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>
            <span className="text-slate-300">
              {t("settings.backup.blocks", language, { count: blocks.length })}
            </span>
          </li>
          <li>
            <span className="text-slate-300">
              {t("settings.backup.boards", language, {
                count: Object.keys(boards).length,
              })}
            </span>
          </li>
          <li>
            <span className="text-slate-300">
              {t("settings.backup.settingsInfo", language)}
            </span>
          </li>
        </ul>
        <p className="mt-2 text-slate-500">
          {t("settings.backup.warning", language)}
        </p>
      </div>
    </section>
  );
}

/* ---------- Страница настроек ---------- */

export default function SettingsPage() {
  const pushToast = useDashboardStore((s) => s.pushToast);
  const refreshVault = useDashboardStore((s) => s.refreshVault);
  const resetDashboard = useDashboardStore((s) => s.resetDashboard);
  const vault = useDashboardStore((s) => s.vault);
  const language = useDashboardStore((s) => s.language);

  function manualRefresh() {
    refreshVault();
    pushToast("success", t("settings.vaultRefreshSuccess", language));
  }

  function handleReset() {
    if (confirm(t("settings.dashboard.confirm", language))) {
      resetDashboard();
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
          <Settings2 size={18} className="text-cyan-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            {t("settings.title", language)}
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        <LanguageSection />

        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <RefreshCw size={15} className="text-cyan-300" />{" "}
            {t("settings.vault.title", language)}
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">
            {t("settings.vault.description", language, { count: vault.length })}
          </p>
          <button
            onClick={manualRefresh}
            className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
          >
            <RefreshCw size={13} /> {t("settings.vault.refresh", language)}
          </button>
        </section>

        <LogoSection />
        <BackgroundSection />
        <ThemeSection />
        <BackupSection />

        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Palette size={15} className="text-violet-300" />{" "}
            {t("settings.dashboard.title", language)}
          </h2>
          <div className="flex items-center justify-between rounded-md bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-slate-300">
              {t("settings.dashboard.reset", language)}
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-400/15"
            >
              <Trash2 size={12} /> {t("settings.dashboard.clear", language)}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}