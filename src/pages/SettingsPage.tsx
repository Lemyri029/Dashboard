import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Type,
  ChevronDown,
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import {
  resolveBackgroundUrl,
  saveBackgroundFile,
  ImageSuggestModal,
} from "../utils/background";
import { DEFAULT_THEME, getTheme } from "../utils/themes";
import { THEMES_FOLDER } from "../utils/themeLoader";
import { t, LANGUAGES } from "../i18n";
import { confirmDialog } from "../components/ConfirmDialog";

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

/* ---------- Сворачиваемая карточка настроек ---------- */

function SettingsPanel({
  title,
  icon,
  rightAction,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  rightAction?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const language = useDashboardStore((s) => s.language);
  const [open, setOpen] = useState(defaultOpen);

  function togglePanel() {
    setOpen((value) => !value);
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <div
        onClick={togglePanel}
        title={t(
          open ? "settings.panel.collapse" : "settings.panel.expand",
          language
        )}
        className={`flex cursor-pointer select-none items-center ${
          open ? "mb-3" : ""
        }`}
      >
        {/* Левая зона-распорка: той же ширины, что и правая,
            поэтому заголовок оказывается ровно по центру */}
        <div className="min-w-0 flex-1" />

        {/* Центр: иконка + текст */}
        <div className="flex shrink-0 items-center gap-2.5 text-sm font-semibold text-slate-100">
          <span className="flex h-4 w-4 items-center justify-center">
            {icon}
          </span>
          <span className="whitespace-nowrap leading-4">{title}</span>
        </div>

        {/* Правая зона: переключатель (если есть) + стрелка */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {rightAction && (
            <div
              className="flex items-center"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {rightAction}
            </div>
          )}

          <span className="flex h-4 w-4 items-center justify-center">
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform duration-200 ${
                open ? "rotate-180" : "rotate-0"
              }`}
            />
          </span>
        </div>
      </div>

      <div className={open ? "block" : "hidden"}>{children}</div>
    </section>
  );
}

/* ---------- Язык ---------- */

function LanguageSection() {
  const language = useDashboardStore((s) => s.language);
  const setLanguage = useDashboardStore((s) => s.setLanguage);

  return (
    <SettingsPanel
      title={t("settings.language.title", language)}
      icon={<Globe size={15} className="text-amber-300" />}
    >
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
     </SettingsPanel>
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
    <SettingsPanel
      title={t("settings.logo.title", language)}
      icon={<ImageIcon size={15} className="text-cyan-300" />}
    >

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
       </SettingsPanel>
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
    <SettingsPanel
      title={t("settings.background.title", language)}
      icon={<ImageIcon size={15} className="text-emerald-300" />}
      rightAction={
        <Toggle
          checked={background.enabled}
          onChange={(v) => setBackground({ enabled: v })}
        />
      }
    >

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
    </SettingsPanel>

  );
}

function ThemeSection() {
  const theme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);
  const customThemes = useDashboardStore((s) => s.customThemes);
  const themesLoading = useDashboardStore((s) => s.themesLoading);
  const reloadThemes = useDashboardStore((s) => s.reloadThemes);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const language = useDashboardStore((s) => s.language);

  async function handleReload() {
    await reloadThemes();
    const count = useDashboardStore.getState().customThemes.length;
    pushToast("success", t("settings.theme.reloaded", language, { count }));
  }

  function handleResetTheme() {
    setTheme(DEFAULT_THEME);
    pushToast("success", t("settings.theme.resetDone", language));
  }

  const selectedCustom = customThemes.some((th) => th.id === theme) ? theme : "";
  // Хочешь чтобы в списке писало "eink-paper" - оставь DEFAULT_THEME
  // Хочешь чтобы писало "Ink Paper" - замени на getTheme(DEFAULT_THEME).label
  const defaultLabel = getTheme(DEFAULT_THEME).label;

    return (
    <SettingsPanel
      title={t("settings.theme.title", language)}
      icon={<Palette size={15} className="text-violet-300" />}
    >

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
          onClick={handleResetTheme}
          className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-400/15"
        >
          <RotateCcw size={13} /> {t("settings.theme.reset", language)}
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
        <select
          value={selectedCustom}
          onChange={(e) => {
            if (e.target.value) setTheme(e.target.value);
          }}
          className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/40"
        >
          <option value="" disabled>
            {defaultLabel}
          </option>
          {customThemes.map((th) => (
            <option key={th.source ?? th.id} value={th.id}>
              {th.label}
            </option>
          ))}
        </select>
      )}
     </SettingsPanel>
  );
}

/* ---------- Типографика ---------- */

function TypographySection() {
  const typography = useDashboardStore((s) => s.typography);
  const setTypography = useDashboardStore((s) => s.setTypography);
  const resetTypography = useDashboardStore((s) => s.resetTypography);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const language = useDashboardStore((s) => s.language);

  const [tab, setTab] = useState<"sidebar" | "dashboard">("dashboard");

  function handleReset() {
    resetTypography();
    pushToast("success", t("settings.typography.resetDone", language));
  }

    return (
    <SettingsPanel
      title={t("settings.typography.title", language)}
      icon={<Type size={15} className="text-cyan-300" />}
    >

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {t("settings.typography.description", language)}
      </p>

      <div className="mb-4 flex gap-2">
  <button
    type="button"
    onClick={() => setTab("dashboard")}
    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
      tab === "dashboard"
        ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
        : "bg-white/10 text-slate-400 hover:bg-white/20"
    }`}
  >
    {t("settings.typography.dashboard", language)}
  </button>

  <button
    type="button"
    onClick={() => setTab("sidebar")}
    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
      tab === "sidebar"
        ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
        : "bg-white/10 text-slate-400 hover:bg-white/20"
    }`}
  >
    {t("settings.typography.sidebar", language)}
  </button>
</div>

      {tab === "sidebar" && (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t("settings.typography.fontSize", language)}</span>
              <span className="text-cyan-300">{typography.sidebar.fontSize}px</span>
            </div>
            <input
              type="range"
              min={11}
              max={20}
              step={1}
              value={typography.sidebar.fontSize}
              onChange={(e) =>
                setTypography("sidebar", { fontSize: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t("settings.typography.fontWeight", language)}</span>
              <span className="text-cyan-300">{typography.sidebar.fontWeight}</span>
            </div>
            <input
              type="range"
              min={300}
              max={800}
              step={100}
              value={typography.sidebar.fontWeight}
              onChange={(e) =>
                setTypography("sidebar", { fontWeight: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      )}

            {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{t("settings.typography.fontSize", language)}</span>
                <span className="text-cyan-300">{typography.dashboard.fontSize}px</span>
              </div>
              <input
                type="range"
                min={11}
                max={20}
                step={1}
                value={typography.dashboard.fontSize}
                onChange={(e) =>
                  setTypography("dashboard", { fontSize: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{t("settings.typography.fontWeight", language)}</span>
                <span className="text-cyan-300">{typography.dashboard.fontWeight}</span>
              </div>
              <input
                type="range"
                min={300}
                max={800}
                step={100}
                value={typography.dashboard.fontWeight}
                onChange={(e) =>
                  setTypography("dashboard", { fontWeight: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
              {t("settings.typography.blockTitles", language)}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("settings.typography.blockTitleSize", language)}</span>
                  <span className="text-cyan-300">
                    {typography.blockTitle.fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={20}
                  step={1}
                  value={typography.blockTitle.fontSize}
                  onChange={(e) =>
                    setTypography("blockTitle", { fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("settings.typography.blockTitleWeight", language)}</span>
                  <span className="text-cyan-300">
                    {typography.blockTitle.fontWeight}
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={800}
                  step={100}
                  value={typography.blockTitle.fontWeight}
                  onChange={(e) =>
                    setTypography("blockTitle", { fontWeight: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
              {t("settings.typography.blockContent", language)}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("settings.typography.fontSize", language)}</span>
                  <span className="text-cyan-300">
                    {typography.blockContent.fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={9}
                  max={18}
                  step={1}
                  value={typography.blockContent.fontSize}
                  onChange={(e) =>
                    setTypography("blockContent", { fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("settings.typography.fontWeight", language)}</span>
                  <span className="text-cyan-300">
                    {typography.blockContent.fontWeight}
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={800}
                  step={100}
                  value={typography.blockContent.fontWeight}
                  onChange={(e) =>
                    setTypography("blockContent", { fontWeight: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-400/15"
        >
          <RotateCcw size={13} /> {t("settings.typography.reset", language)}
        </button>
      </div>
    </SettingsPanel>
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

     const ok = await confirmDialog({
      title: t("dialog.loadBackupTitle", language),
      message: t("settings.backup.confirm", language),
      confirmLabel: t("dialog.ok", language),
      cancelLabel: t("dialog.cancel", language),
      danger: false,
    });

    if (!ok) return;

    setBusy(true);
    try {
      await importBackupFromFile(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsPanel
      title={t("settings.backup.title", language)}
      icon={<DatabaseBackup size={15} className="text-amber-300" />}
    >

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
     </SettingsPanel>
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

  async function handleReset() {
    const confirmed = await confirmDialog({
      title: t("dialog.deleteBlocksTitle", language),
      message: t("settings.dashboard.confirm", language),
      confirmLabel: t("settings.dashboard.clear", language),
      cancelLabel: t("dialog.cancel", language),
      danger: true,
    });

    if (confirmed) {
      resetDashboard();
    }
  }

  return (
        <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
          <Settings2 size={18} className="text-cyan-300" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          {t("settings.title", language)}
        </h1>
      </div>

      <div
  className="grid gap-5"
  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))" }}
>
        {/* ---------- Левая колонка: Системные ---------- */}
        <div className="space-y-4">
          <h2 className="px-1 text-sm font-semibold text-slate-300">
            {t("settings.section.system", language)}
          </h2>

          <LanguageSection />

          <SettingsPanel
  title={t("settings.vault.title", language)}
  icon={<RefreshCw size={15} className="text-cyan-300" />}
>
  <p className="mb-3 text-xs leading-relaxed text-slate-400">
    {t("settings.vault.description", language, { count: vault.length })}
  </p>

  <button
    onClick={manualRefresh}
    className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
  >
    <RefreshCw size={13} /> {t("settings.vault.refresh", language)}
  </button>
</SettingsPanel>

          <BackupSection />

          <SettingsPanel
  title={t("settings.dashboard.title", language)}
  icon={<Palette size={15} className="text-violet-300" />}
>
  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.02] px-3 py-2">
    <span className="text-xs text-slate-300">
      {t("settings.dashboard.reset", language)}
    </span>

    <button
      onClick={handleReset}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-400/15"
    >
      <Trash2 size={12} /> {t("settings.dashboard.clear", language)}
    </button>
  </div>
</SettingsPanel>
        </div>

        {/* ---------- Правая колонка: Оформление ---------- */}
          <div className="space-y-4">
          <h2 className="px-1 text-sm font-semibold text-slate-300">
            {t("settings.section.appearance", language)}
          </h2>

          <LogoSection />
          <BackgroundSection />
          <ThemeSection />
          <TypographySection />
        </div>
      </div>
    </div>
  );
}