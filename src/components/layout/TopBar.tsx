import { useEffect, useState } from "react";
import { Radio, Menu } from "lucide-react";


export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-white/5 bg-[#070a0f]/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <Radio size={13} className="text-cyan-400" />
          <span className="font-mono-techno">
            {now.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} ·{" "}
            {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
      {/* Поиск убран — используйте Cmd+K или поиск в Sidebar */}
    </header>
  );
}