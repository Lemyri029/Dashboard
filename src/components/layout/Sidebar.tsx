import { LayoutDashboard, FolderTree, Settings, Search, Command } from "lucide-react";
import { useDashboardStore, type Page } from "../../store/dashboardStore";
import { cn } from "../../utils/cn";
import logoIcon from "../../assets/logo-icon.png";
import logoMain from "../../assets/logo-main.png";
import logoSub from "../../assets/logo-sub.png";
import { ToiletBreakTimer } from "../ToiletBreakTimer";
import { CalendarWidget } from "../CalendarWidget";

const NAV_ITEMS: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: { name: "dashboard" }, label: "Дашборд", icon: LayoutDashboard },
  { page: { name: "files" }, label: "Файлы vault", icon: FolderTree },
  { page: { name: "settings" }, label: "Настройки", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const currentPage = useDashboardStore((s) => s.page);
  const navigate = useDashboardStore((s) => s.navigate);
  const setCommandPaletteOpen = useDashboardStore((s) => s.setCommandPaletteOpen);
  const customLogo = useDashboardStore((s) => s.customLogo);

  return (
    <aside
      className="flex h-screen w-72 shrink-0 flex-col border-r border-white/5 bg-[#070a0f]/95 lg:h-full"
    >
            {/* ===== ЛОГОТИП ===== */}
      <div
        style={{
          height: "190px",
          minHeight: "190px",
          maxHeight: "190px",
          flexShrink: 0,
          flexGrow: 0,
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {customLogo ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={customLogo}
              alt="Логотип дашборда"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        ) : (
          <div className="flex w-full items-center gap-4">
            <img
              src={logoIcon}
              alt=""
              className="shrink-0"
              style={{
                height: "118px",
                width: "auto",
                objectFit: "contain",
              }}
            />

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <img
                src={logoMain}
                alt="AVILEX"
                style={{
                  height: "46px",
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  objectPosition: "left center",
                }}
              />
              <img
                src={logoSub}
                alt="Архитектура"
                style={{
                  height: "23px",
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  objectPosition: "left center",
                  opacity: 0.9,
                }}
              />
            </div>
          </div>
        )}
      </div>
      {/* ===== /ЛОГОТИП ===== */}

      <div className="px-3 pt-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 transition hover:border-cyan-400/30 hover:text-slate-200"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Быстрый поиск...</span>
          <span className="flex items-center gap-0.5 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">
            <Command size={10} />K
          </span>
        </button>
      </div>

      <nav className="mt-3 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage.name === item.page.name;
          return (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.page);
                onNavigate?.();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                isActive
                  ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <ToiletBreakTimer />
      <CalendarWidget />

      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          Avilex Dashboard: <span className="text-emerald-400">плагин активен</span>
        </div>
      </div>
    </aside>
  );
}