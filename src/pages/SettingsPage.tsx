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
} from "lucide-react";
import { useDashboardStore } from "../store/dashboardStore";
import {
  resolveBackgroundUrl,
  saveBackgroundFile,
  ImageSuggestModal,
} from "../utils/background";
import { type DashboardTheme } from "../utils/themes";
import { THEMES_FOLDER, createThemeTemplate } from "../utils/themeLoader";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-cyan-400/70" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function LogoSection() {
  const customLogo = useDashboardStore((s) => s.customLogo);
  const setCustomLogo = useDashboardStore((s) => s.setCustomLogo);
  const clearCustomLogo = useDashboardStore((s) => s.clearCustomLogo);
  const pushToast = useDashboardStore((s) => s.pushToast);

  const logoInputRef = useRef<HTMLInputElement>(null);

  async function onUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      pushToast("error", "Неподдерживаемый формат", "Разрешены PNG, JPG, SVG или WEBP");
      return;
    }

    const MAX_SIZE = 1024 * 1024;
    if (file.size > MAX_SIZE) {
      pushToast("error", "Файл слишком большой", "Максимальный размер — 1 МБ");
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
      pushToast("success", "Логотип обновлён", file.name);
    } catch (err) {
      pushToast(
        "error",
        "Не удалось загрузить логотип",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <ImageIcon size={15} className="text-cyan-300" /> Логотип дашборда
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Заменяет логотип в левой панели. Изображение автоматически масштабируется
        под доступное пространство.
      </p>

      <div className="mb-3 flex h-[120px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3">
        {customLogo ? (
          <img
            src={customLogo}
            alt="Текущий логотип"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-slate-500">
            Используется стандартный логотип
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => logoInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Upload size={13} /> Загрузить логотип
        </button>

        {customLogo && (
          <button
            onClick={() => {
              clearCustomLogo();
              pushToast("info", "Логотип сброшен", "Возвращён стандартный логотип");
            }}
            className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-400/15"
          >
            <RotateCcw size={13} /> Сбросить
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
        <p className="mb-1 font-medium text-slate-300">Требования к изображению:</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>Форматы: <span className="text-slate-300">PNG, JPG, SVG, WEBP</span></li>
          <li>Рекомендуемый размер: <span className="text-slate-300">~500 × 190 px</span> (горизонтальный)</li>
          <li>Максимальный вес файла: <span className="text-slate-300">1 МБ</span></li>
          <li>Лучше использовать <span className="text-slate-300">PNG с прозрачным фоном</span></li>
        </ul>
      </div>
    </section>
  );
}

function BackgroundSection() {
  const app = useDashboardStore((s) => s.app);
  const background = useDashboardStore((s) => s.background);
  const setBackground = useDashboardStore((s) => s.setBackground);
  const resetBackground = useDashboardStore((s) => s.resetBackground);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const refreshVault = useDashboardStore((s) => s.refreshVault);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState(background.imageUrl ?? "");

  useEffect(() => {
    setUrlDraft(background.imageUrl ?? "");
  }, [background.imageUrl]);

  const previewUrl = resolveBackgroundUrl(app, background);
  const activeSource = background.imagePath ?? background.imageUrl;

  function pickFromVault() {
    if (!app) {
      pushToast("error", "Obsidian не подключён");
      return;
    }

    new ImageSuggestModal(app, (file) => {
      const newBackground = {
        imagePath: file.path,
        imageUrl: null,
        enabled: true,
      };

      setBackground(newBackground);
      setUrlDraft("");

      console.log("[Matreshka] Selected vault background:", file.path);

      pushToast("success", "Фон установлен", file.path);
    }).open();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!app) return pushToast("error", "Obsidian не подключён");
    try {
      const path = await saveBackgroundFile(app, file);
      setBackground({
        imagePath: path,
        imageUrl: null,
        enabled: true,
      });
      console.log("[Matreshka] Uploaded background:", path);
      setUrlDraft("");
      refreshVault();
      pushToast("success", "Фон загружен", path);
    } catch (err) {
      pushToast("error", "Не удалось загрузить фон", err instanceof Error ? err.message : String(err));
    }
  }

  function applyUrl() {
    const url = urlDraft.trim();
    setBackground({
      imageUrl: url || null,
      imagePath: url ? null : background.imagePath,
      enabled: true,
    });
    if (url) pushToast("success", "Фон по ссылке установлен");
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <ImageIcon size={15} className="text-emerald-300" /> Фон дашборда
        </h2>
        <Toggle
          checked={background.enabled}
          onChange={(v) => setBackground({ enabled: v })}
        />
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Картинка подкладывается под все панели. Загруженные файлы сохраняются в папку{" "}
        <code className="text-slate-300">dashboard-assets</code> внутри хранилища.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={pickFromVault}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <FolderOpen size={13} /> Из хранилища
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Upload size={13} /> С диска
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onUpload} />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-[11px] text-slate-500">Или внешняя ссылка</label>
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyUrl()}
            onBlur={applyUrl}
            placeholder="https://…"
            className="flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
          />
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Затемнение</span>
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
        <span>Размытие</span>
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
            style={{ backgroundColor: "var(--background-primary)", opacity: background.dim }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="max-w-[60%] truncate text-[11px] text-slate-500">
          {activeSource ? `Источник: ${activeSource}` : "Фон не выбран"}
        </span>
        <button
          onClick={() => {
            resetBackground();
            setUrlDraft("");
          }}
          className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-400/15"
        >
          <RotateCcw size={12} /> Сбросить фон
        </button>
      </div>
    </section>
  );
}

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

  async function handleReload() {
    await reloadThemes();
    pushToast("success", "Темы обновлены", `Найдено пользовательских: ${useDashboardStore.getState().customThemes.length}`);
  }

  async function handleTemplate() {
    if (!app) return pushToast("error", "Obsidian не подключён");
    try {
      const path = await createThemeTemplate(app);
      await reloadThemes();
      refreshVault();
      pushToast("success", "Шаблон создан", path);
    } catch (e) {
      pushToast("error", "Не удалось создать шаблон", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Palette size={15} className="text-violet-300" /> Тема оформления
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Тема меняет цвета, скругления, тени и шрифты. Свои темы кладите в папку{" "}
        <code className="text-slate-300">{THEMES_FOLDER}</code> в виде{" "}
        <code className="text-slate-300">.json</code> файлов.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handleReload}
          disabled={themesLoading}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25 disabled:opacity-50"
        >
          <RefreshCw size={13} className={themesLoading ? "animate-spin" : ""} /> Обновить темы
        </button>
        <button
          onClick={handleTemplate}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <FolderOpen size={13} /> Создать шаблон темы
        </button>
      </div>

      <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        Пользовательские ({customThemes.length})
      </div>
      {customThemes.length === 0 ? (
        <div className="rounded-md bg-white/[0.02] px-3 py-3 text-[11px] text-slate-500">
          Пока пусто. Нажмите «Создать шаблон темы» или положите свой .json в папку{" "}
          <code className="text-slate-400">{THEMES_FOLDER}</code> и нажмите «Обновить темы».
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

function BackupSection() {
  const downloadBackup = useDashboardStore((s) => s.downloadBackup);
  const importBackupFromFile = useDashboardStore((s) => s.importBackupFromFile);
  const blocks = useDashboardStore((s) => s.blocks);
  const boards = useDashboardStore((s) => s.boards);

  const backupInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPickBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ok = confirm(
      "Загрузить дашборд из файла?\n\nТекущие блоки, страницы, фон, тема и логотип будут заменены. Файлы в хранилище Obsidian затронуты не будут."
    );
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
        <DatabaseBackup size={15} className="text-amber-300" /> Резервная копия дашборда
      </h2>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Сохраняет всю конфигурацию дашборда в один <code className="text-slate-300">.json</code> файл:
        блоки и их вложенность, содержимое заметок в блоках, страницы, фон, тему и логотип.
        Файл можно перенести на другое устройство и загрузить обратно.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={downloadBackup}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
        >
          <Download size={13} /> Сохранить в JSON
        </button>

        <button
          onClick={() => backupInputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/25 disabled:opacity-50"
        >
          <Upload size={13} /> Загрузить из JSON
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
        <p className="mb-1 font-medium text-slate-300">В копию входит:</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>Блоки верхнего уровня: <span className="text-slate-300">{blocks.length}</span></li>
          <li>Страницы (доски): <span className="text-slate-300">{Object.keys(boards).length}</span></li>
          <li>Настройки фона, темы и логотипа</li>
        </ul>
        <p className="mt-2 text-slate-500">
          Внимание: сами файлы хранилища (.md, .flow, .hostly) в JSON не копируются —
          для них используйте синхронизацию хранилища Obsidian.
        </p>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const pushToast = useDashboardStore((s) => s.pushToast);
  const refreshVault = useDashboardStore((s) => s.refreshVault);
  const resetDashboard = useDashboardStore((s) => s.resetDashboard);
  const vault = useDashboardStore((s) => s.vault);

  function manualRefresh() {
    refreshVault();
    pushToast("success", "Vault обновлён", "Дерево файлов синхронизировано");
  }

  function handleReset() {
    if (confirm("Удалить все блоки дашборда? Файлы в vault затронуты не будут.")) {
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
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Настройки</h1>
        </div>
      </div>

      <div className="space-y-4">
        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <RefreshCw size={15} className="text-cyan-300" /> Vault
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">
            Дашборд напрямую использует файлы текущего хранилища Obsidian — отдельная настройка пути
            или ключей доступа не требуется. Сейчас в дереве {vault.length} элементов верхнего уровня.
          </p>
          <button
            onClick={manualRefresh}
            className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-3.5 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
          >
            <RefreshCw size={13} /> Обновить дерево файлов
          </button>
        </section>

        <LogoSection />
        <BackgroundSection />
        <ThemeSection />
        <BackupSection />

        <section className="glass-panel rounded-xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Palette size={15} className="text-violet-300" /> Дашборд
          </h2>
          <div className="flex items-center justify-between rounded-md bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-slate-300">Сбросить дашборд к пустому состоянию</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-400/15"
            >
              <Trash2 size={12} /> Очистить блоки
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}