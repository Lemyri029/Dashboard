import { useEffect, useState } from "react";

// ================================
// 👇 НАСТРОЙКИ — меняй только здесь
// ================================

// Расписание перерывов (формат "ЧЧ:ММ")
const BREAKS = [
  { start: "10:00", end: "10:30" },
  { start: "12:30", end: "13:00" },
  { start: "15:00", end: "15:30" },
  { start: "17:30", end: "18:00" },
  { start: "19:30", end: "20:00" },
];

// До этого времени с утра — всегда "Открыто" (буфер перед первым перерывом)
const MORNING_BUFFER_END = "09:30";

// ================================

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ToiletBreakTimer() {
  const [status, setStatus] = useState<{ label: string; time: string }>({
    label: "Открыто",
    time: "0:00",
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const nowSec = now.getSeconds();
      const currentTotalSeconds = nowMin * 60 + nowSec;

      const bufferEnd = toMinutes(MORNING_BUFFER_END);
      const sortedBreaks = [...BREAKS].sort(
        (a, b) => toMinutes(a.start) - toMinutes(b.start)
      );
      const lastBreakEnd = toMinutes(sortedBreaks[sortedBreaks.length - 1].end);

      // Утренний буфер (например 9:00–9:30) или после последнего
      // перерыва вечером (например после 20:00 и до 9:30 утра)
      if (nowMin < bufferEnd || nowMin >= lastBreakEnd) {
        setStatus({ label: "Открыто", time: "0:00" });
        return;
      }

      // Проверяем — идёт ли перерыв прямо сейчас
      for (const br of sortedBreaks) {
        const startSec = toMinutes(br.start) * 60;
        const endSec = toMinutes(br.end) * 60;

        if (currentTotalSeconds >= startSec && currentTotalSeconds < endSec) {
          const remaining = endSec - currentTotalSeconds;
          setStatus({ label: "До открытия", time: formatTime(remaining) });
          return;
        }
      }

      // Перерыва сейчас нет — ищем следующий
      for (const br of sortedBreaks) {
        const startSec = toMinutes(br.start) * 60;
        if (startSec > currentTotalSeconds) {
          const remaining = startSec - currentTotalSeconds;
          setStatus({ label: "До закрытия", time: formatTime(remaining) });
          return;
        }
      }

      // На всякий случай (не должно доходить сюда при правильных настройках)
      setStatus({ label: "Открыто", time: "0:00" });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-5 py-2">
      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-center">
        <div className="text-[11px] text-slate-400">{status.label}</div>
        <div className="text-xl font-bold text-cyan-300">{status.time}</div>
      </div>
    </div>
  );
}