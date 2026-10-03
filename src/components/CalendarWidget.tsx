import { useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  parseISO,
  startOfDay,
  isBefore,
  isAfter,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  getDate,
  getDaysInMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  X,
  Trash2,
  Repeat,
} from "lucide-react";

type RepeatFreq = "none" | "daily" | "weekly" | "monthly" | "yearly";

type RepeatRule = {
  freq: RepeatFreq;
  interval: number;
  until?: string; // yyyy-MM-dd
};

type CalendarEvent = {
  id: string;
  date: string; // yyyy-MM-dd — дата первого события
  title: string;
  time?: string; // HH:mm
  repeat?: RepeatRule;
};

const STORAGE_KEY = "avilex-calendar-events";

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* ignore */
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Проверяет, попадает ли событие (с учётом повторов) на указанный день */
function occursOn(ev: CalendarEvent, date: Date): boolean {
  const base = startOfDay(parseISO(ev.date));
  const target = startOfDay(date);

  if (isBefore(target, base)) return false;

  const rep = ev.repeat;
  if (!rep || rep.freq === "none") return isSameDay(target, base);

  if (rep.until) {
    const until = startOfDay(parseISO(rep.until));
    if (isAfter(target, until)) return false;
  }

  const interval = Math.max(1, rep.interval || 1);

  switch (rep.freq) {
    case "daily": {
      return differenceInCalendarDays(target, base) % interval === 0;
    }
    case "weekly": {
      return differenceInCalendarDays(target, base) % (7 * interval) === 0;
    }
    case "monthly": {
      const diff = differenceInCalendarMonths(target, base);
      if (diff < 0 || diff % interval !== 0) return false;
      // если в месяце меньше дней (31 → 30/28), берём последний день месяца
      const desired = Math.min(getDate(base), getDaysInMonth(target));
      return getDate(target) === desired;
    }
    case "yearly": {
      const diff = differenceInCalendarYears(target, base);
      if (diff < 0 || diff % interval !== 0) return false;
      if (target.getMonth() !== base.getMonth()) return false;
      const desired = Math.min(getDate(base), getDaysInMonth(target));
      return getDate(target) === desired;
    }
    default:
      return false;
  }
}

function eventsForDate(events: CalendarEvent[], date: Date) {
  return events
    .filter((e) => occursOn(e, date))
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}

function repeatLabel(rep?: RepeatRule): string | null {
  if (!rep || rep.freq === "none") return null;
  const i = Math.max(1, rep.interval || 1);
  switch (rep.freq) {
    case "daily":
      return i === 1 ? "Каждый день" : `Каждые ${i} дн.`;
    case "weekly":
      return i === 1 ? "Каждую неделю" : `Каждые ${i} нед.`;
    case "monthly":
      return i === 1 ? "Каждый месяц" : `Каждые ${i} мес.`;
    case "yearly":
      return i === 1 ? "Каждый год" : `Каждые ${i} г.`;
    default:
      return null;
  }
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.03)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.1)",
};

export function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [freq, setFreq] = useState<RepeatFreq>("none");
  const [interval, setIntervalValue] = useState(1);
  const [until, setUntil] = useState("");

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  // Построение сетки месяца
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calendarStart;
  while (d <= calendarEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  // Ближайшие события на 120 дней вперёд (с учётом повторов)
  const upcoming: { ev: CalendarEvent; date: Date }[] = [];
  {
    const today = startOfDay(new Date());
    for (let i = 0; i < 120 && upcoming.length < 4; i++) {
      const day = addDays(today, i);
      for (const ev of eventsForDate(events, day)) {
        upcoming.push({ ev, date: day });
        if (upcoming.length >= 4) break;
      }
    }
  }

  const selectedEvents = eventsForDate(events, selectedDate);

  const handleOpenCreate = () => {
    setTitle("");
    setTime("");
    setFreq("none");
    setIntervalValue(1);
    setUntil("");
    setModalOpen(true);
  };

  const handleSave = () => {
    if (title.trim() === "") return;
    const newEvent: CalendarEvent = {
      id: makeId(),
      date: format(selectedDate, "yyyy-MM-dd"),
      title: title.trim(),
      time: time || undefined,
      repeat:
        freq === "none"
          ? undefined
          : {
              freq,
              interval: Math.max(1, interval || 1),
              until: until || undefined,
            },
    };
    setEvents((prev) => [...prev, newEvent]);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
      <div className="flex flex-col gap-4 border-t border-white/5 p-4">
        {/* Шапка */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold capitalize text-slate-200">
              {format(currentMonth, "LLLL yyyy", { locale: ru })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenCreate}
              style={{
                backgroundColor: "#22d3ee",
                color: "#000000",
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                padding: 0,
                cursor: "pointer",
                boxShadow: "0 0 8px rgba(34,211,238,0.35)",
                marginRight: "4px",
              }}
              title={`Создать событие — ${format(selectedDate, "d MMMM yyyy", {
                locale: ru,
              })}`}
            >
              <Plus size={14} strokeWidth={3} style={{ color: "#000000" }} />
            </button>

            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Сетка */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            rowGap: "6px",
            columnGap: "2px",
          }}
        >
          {weekdays.map((wd) => (
            <div
              key={wd}
              className="mb-1 text-center text-xs font-semibold text-slate-300"
            >
              {wd}
            </div>
          ))}

          {days.map((day) => {
            const isCur = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);
            const isSelected = isSameDay(day, selectedDate);
            const dayEvents = eventsForDate(events, day);

            return (
              <div key={day.toISOString()} className="flex flex-col items-center">
                <div
                  onClick={() => {
                    setSelectedDate(day);
                    if (!isSameMonth(day, currentMonth)) setCurrentMonth(day);
                  }}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs transition-colors ${
                    isTodayDay
                      ? "bg-cyan-400 font-bold text-black shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                      : isSelected
                      ? "bg-white/10 font-semibold text-cyan-300 ring-1 ring-cyan-400/70"
                      : isCur
                      ? "text-slate-200 hover:bg-white/10"
                      : "text-slate-600 hover:bg-white/5"
                  } ${
                    isTodayDay && isSelected
                      ? "ring-2 ring-cyan-300/60 ring-offset-2 ring-offset-[#070a0f]"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </div>

                <div className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={`block h-1 w-1 rounded-full ${
                        ev.repeat ? "bg-violet-400" : "bg-cyan-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Список событий */}
        <div className="mt-1 space-y-2">
          {selectedEvents.length > 0 ? (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
                {format(selectedDate, "d MMMM", { locale: ru })}
              </div>
              <div className="space-y-1.5">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="group flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-2"
                  >
                    <div
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        ev.repeat ? "bg-violet-400" : "bg-cyan-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-slate-200">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        {ev.time && <span>{ev.time}</span>}
                        {ev.repeat && (
                          <span className="flex items-center gap-0.5 text-violet-400/80">
                            <Repeat size={9} />
                            {repeatLabel(ev.repeat)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="text-slate-500 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                      title={ev.repeat ? "Удалить всю серию" : "Удалить"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Ближайшие события
              </div>
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <div className="text-[11px] text-slate-400">
                    Выберите день и нажмите «+»
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcoming.map(({ ev, date }) => (
                    <div
                      key={ev.id + format(date, "yyyy-MM-dd")}
                      className="group flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:border-cyan-400/20 hover:bg-white/[0.04]"
                    >
                      <div
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          ev.repeat ? "bg-violet-400" : "bg-cyan-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] text-slate-200">
                          {ev.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span>
                            {format(date, "d MMM", { locale: ru })}
                            {ev.time ? ` · ${ev.time}` : ""}
                          </span>
                          {ev.repeat && (
                            <Repeat size={9} className="text-violet-400/80" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="text-slate-500 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                        title={ev.repeat ? "Удалить всю серию" : "Удалить"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модалка */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-[340px] rounded-xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Новое событие
                </div>
                <div className="text-[11px] text-slate-500">
                  {format(selectedDate, "d MMMM yyyy", { locale: ru })}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Название
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setModalOpen(false);
                  }}
                  placeholder="Например, встреча с клиентом"
                  style={inputStyle}
                  className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-400">
                  Время (необязательно)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={inputStyle}
                  className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400/40"
                />
              </div>

              {/* ПОВТОР */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Repeat size={11} /> Повтор
                </label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as RepeatFreq)}
                  style={{ ...inputStyle, backgroundColor: "#161b22" }}
                  className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400/40"
                >
                  <option value="none">Не повторять</option>
                  <option value="daily">Каждый день</option>
                  <option value="weekly">Каждую неделю</option>
                  <option value="monthly">Каждый месяц (то же число)</option>
                  <option value="yearly">Каждый год</option>
                </select>
              </div>

              {freq !== "none" && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Интервал — каждые{" "}
                      <span className="text-cyan-400">{interval}</span>{" "}
                      {freq === "daily"
                        ? "дн."
                        : freq === "weekly"
                        ? "нед."
                        : freq === "monthly"
                        ? "мес."
                        : "г."}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={interval}
                      onChange={(e) =>
                        setIntervalValue(Math.max(1, Number(e.target.value)))
                      }
                      style={inputStyle}
                      className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Повторять до (необязательно)
                    </label>
                    <input
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      style={inputStyle}
                      className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400/40"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/5"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={title.trim() === ""}
                style={{ backgroundColor: "#22d3ee", color: "#000000" }}
                className="rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}