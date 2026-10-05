import { LayoutDashboard, FolderTree, Settings, Search, Command } from "lucide-react";
import { useDashboardStore } from "../../store/dashboardStore";
import logoIcon from "../../assets/logo-icon.png";
import logoMain from "../../assets/logo-main.png";
import logoSub from "../../assets/logo-sub.png";
import { ToiletBreakTimer } from "../ToiletBreakTimer";
import { CalendarWidget } from "../CalendarWidget";
import { t } from "../../i18n";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const currentPage = useDashboardStore((s) => s.page);
  const navigate = useDashboardStore((s) => s.navigate);
  const setCommandPaletteOpen = useDashboardStore((s) => s.setCommandPaletteOpen);
  const customLogo = useDashboardStore((s) => s.customLogo);
  const language = useDashboardStore((s) => s.language);

  const navItems = [
    {
      page: { name: "dashboard" as const },
      label: t("sidebar.dashboard", language),
      icon: LayoutDashboard,
    },
    {
      page: { name: "files" as const },
      label: t("sidebar.files", language),
      icon: FolderTree,
    },
    {
      page: { name: "settings" as const },
      label: t("sidebar.settings", language),
      icon: Settings,
    },
  ];

  return (
    <aside
      className="flex h-screen w-72 shrink-0 flex-col lg:h-full"
      style={{
        background: "var(--nd-bg-soft)",
        borderRight: "1px solid var(--nd-panel-border)",
        color: "var(--nd-text)",
      }}
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
          borderBottom: "1px solid var(--nd-panel-border)",
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
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
          style={{
            border: "1px solid var(--nd-panel-border)",
            background: "var(--nd-panel)",
            color: "var(--nd-text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--nd-accent)";
            e.currentTarget.style.color = "var(--nd-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--nd-panel-border)";
            e.currentTarget.style.color = "var(--nd-text-muted)";
          }}
        >
          <Search size={14} />
          <span className="flex-1 text-left">{t("sidebar.search", language)}</span>
          <span
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]"
            style={{
              border: "1px solid var(--nd-panel-border)",
              color: "var(--nd-text-faint)",
            }}
          >
            <Command size={10} />K
          </span>
        </button>
      </div>

      <nav className="mt-3 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = currentPage.name === item.page.name;
          return (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.page);
                onNavigate?.();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: "color-mix(in srgb, var(--nd-accent) 14%, transparent)",
                      color: "var(--nd-accent)",
                      boxShadow: "inset 0 0 0 1px var(--nd-accent)",
                    }
                  : {
                      color: "var(--nd-text-muted)",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--nd-panel-hover)";
                  e.currentTarget.style.color = "var(--nd-text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--nd-text-muted)";
                }
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <ToiletBreakTimer />
      <CalendarWidget />
    </aside>
  );
}