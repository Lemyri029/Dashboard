import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Server, Trash2, Wifi } from "lucide-react";
import { v4 as uuid } from "uuid";
import { useDashboardStore } from "../store/dashboardStore";
import type { HostlyService } from "../types";
import { cn } from "../utils/cn";

const STATUS_OPTIONS: HostlyService["status"][] = ["online", "offline", "degraded", "unknown"];
const PROTOCOL_OPTIONS: HostlyService["protocol"][] = ["http", "https", "tcp", "ssh", "ws"];

const STATUS_STYLE: Record<HostlyService["status"], string> = {
  online: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  offline: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
  degraded: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  unknown: "bg-slate-400/15 text-slate-300 ring-slate-400/30",
};

export default function HostlyPage({ path }: { path: string }) {
  const goBack = useDashboardStore((s) => s.goBack);
  const loadHostly = useDashboardStore((s) => s.loadHostly);
  const saveHostly = useDashboardStore((s) => s.saveHostly);
  const pushToast = useDashboardStore((s) => s.pushToast);

  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState<string | null>(null);
  const [services, setServices] = useState<HostlyService[]>([]);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadHostly(path).then((doc) => {
      if (cancelled) return;
      setDocId(doc.id);
      setServices(doc.services);
      setName(doc.name);
      setEnvironment(doc.environment);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Загрузка...
      </div>
    );
  }

  if (!docId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <p className="mb-3">Hostly-файл не найден</p>
        <button onClick={goBack} className="rounded-md border border-white/10 px-3 py-1.5 text-sm">
          Назад
        </button>
      </div>
    );
  }

  function patch(idx: number, p: Partial<HostlyService>) {
    setServices((s) => s.map((svc, i) => (i === idx ? { ...svc, ...p } : svc)));
  }

  function addService() {
    setServices((s) => [
      ...s,
      {
        id: uuid(),
        name: "Новый сервис",
        host: "0.0.0.0",
        port: 80,
        protocol: "http",
        status: "unknown",
        tags: [],
      },
    ]);
  }

  function removeService(idx: number) {
    setServices((s) => s.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!docId) return;
    await saveHostly(path, { id: docId, name, environment, services });
    pushToast("success", "Hostly сохранён", name);
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:border-cyan-400/30 hover:text-slate-200"
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div className="flex items-center gap-2">
          <Server size={16} className="text-amber-300" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md bg-transparent text-base font-semibold text-slate-100 focus:bg-black/30 focus:outline-none"
          />
        </div>
        <button
          onClick={save}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-amber-400/15 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/25"
        >
          <Save size={13} /> Сохранить
        </button>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <label className="text-xs text-slate-500">Окружение:</label>
        <input
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-slate-200 focus:border-amber-400/40 focus:outline-none"
        />
      </div>

      <div className="glass-panel flex-1 overflow-auto rounded-xl p-2">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2">Сервис</th>
              <th className="px-3 py-2">Хост</th>
              <th className="px-3 py-2">Порт</th>
              <th className="px-3 py-2">Протокол</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Теги</th>
              <th className="px-3 py-2">Заметки</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {services.map((svc, idx) => (
              <tr key={svc.id} className="border-t border-white/5 align-top hover:bg-white/[0.02]">
                <td className="px-3 py-2">
                  <input
                    value={svc.name}
                    onChange={(e) => patch(idx, { name: e.target.value })}
                    className="w-32 rounded bg-transparent text-slate-200 focus:bg-black/30 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={svc.host}
                    onChange={(e) => patch(idx, { host: e.target.value })}
                    className="w-28 rounded bg-transparent font-mono-techno text-slate-300 focus:bg-black/30 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={svc.port}
                    onChange={(e) => patch(idx, { port: Number(e.target.value) })}
                    className="w-16 rounded bg-transparent font-mono-techno text-slate-300 focus:bg-black/30 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={svc.protocol}
                    onChange={(e) => patch(idx, { protocol: e.target.value as HostlyService["protocol"] })}
                    className="rounded bg-black/30 px-1.5 py-1 text-slate-300 focus:outline-none"
                  >
                    {PROTOCOL_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={svc.status}
                    onChange={(e) => patch(idx, { status: e.target.value as HostlyService["status"] })}
                    className={cn("rounded-full px-2 py-1 ring-1 focus:outline-none", STATUS_STYLE[svc.status])}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-slate-200">
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={svc.tags.join(", ")}
                    onChange={(e) =>
                      patch(idx, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                    }
                    className="w-32 rounded bg-transparent text-slate-400 focus:bg-black/30 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={svc.notes ?? ""}
                    onChange={(e) => patch(idx, { notes: e.target.value })}
                    className="w-40 rounded bg-transparent text-slate-400 focus:bg-black/30 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeService(idx)}
                    className="rounded p-1 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addService}
          className="m-3 flex items-center gap-1.5 rounded-md border border-dashed border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:border-amber-400/30 hover:text-amber-300"
        >
          <Plus size={13} /> Добавить сервис
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
        <Wifi size={12} className="text-amber-300" />
        Формат .hostly — редактируемый список сервисов/хостов, встроенный в дашборд.
      </div>
    </div>
  );
}