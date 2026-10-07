import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Toasts } from "./Toasts";
import { CommandPalette } from "../CommandPalette";
import { useDashboardStore } from "../../store/dashboardStore";
import { resolveBackgroundUrl } from "../../utils/background";
import { getTheme, getThemeStyle } from "../../utils/themes";
import { buildTypographyCss } from "../../utils/typographyCss";

export function Layout({ children }: { children: ReactNode }) {
  const [, setMobileOpen] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);

  const app = useDashboardStore((s) => s.app);
  const background = useDashboardStore((s) => s.background);
  const commandPaletteOpen = useDashboardStore(
    (s) => s.commandPaletteOpen
  );
  const theme = useDashboardStore((s) => s.theme);
  const customThemes = useDashboardStore((s) => s.customThemes);
  const typography = useDashboardStore((s) => s.typography);
  const page = useDashboardStore((s) => s.page);

  const activeTheme = getTheme(theme, customThemes);

  useEffect(() => {
    setBgUrl(resolveBackgroundUrl(app, background));
  }, [app, background]);

  return (
    <div
      className="Lemo-root relative h-screen w-full overflow-hidden"
      data-theme={activeTheme.id}
      style={getThemeStyle(theme, customThemes)}
    >
      {/* Сначала применяется CSS выбранной темы */}
      {activeTheme.css && <style>{activeTheme.css}</style>}

      {/* Настройки текста идут после темы и имеют приоритет */}
      <style>{buildTypographyCss(typography)}</style>

      {bgUrl && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: `url("${bgUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              width: "100%",
              height: "100%",
              filter: background.blur
                ? `blur(${background.blur}px)`
                : undefined,
              transform: background.blur
                ? "scale(1.05)"
                : undefined,
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              backgroundColor: "var(--nd-bg)",
              opacity: background.dim,
            }}
          />
        </>
      )}

      <div className="relative z-[2] h-full">
        <div className="flex h-full w-full">
          <Sidebar onNavigate={() => setMobileOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <main
              className="min-h-0 flex-1 overflow-auto"
              data-page={page.name}
            >
              {children}
            </main>
          </div>
        </div>

        <Toasts />

        {commandPaletteOpen && <CommandPalette />}
      </div>
    </div>
  );
}