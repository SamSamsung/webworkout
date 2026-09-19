"use client";

import type { WorkoutLog } from "@/types/app";
import { calendarGrid } from "@/lib/streak";

/** Palette d'intensité, du plus discret au plus vif. */
const LEVEL_COLORS = ["#191629", "#2d4a3e", "#3f7a4f", "#6bb45f", "#a3e635"];

/**
 * Calendrier d'assiduité type « graphe de contributions ».
 * Une case par jour, colorée selon l'XP gagnée : c'est le retour visuel le
 * plus efficace pour donner envie de ne pas casser la chaîne.
 */
export function TrainingCalendar({ logs, weeks = 26 }: { logs: WorkoutLog[]; weeks?: number }) {
  const cells = calendarGrid(logs, weeks);
  const columns: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {columns.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${new Date(cell.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })} — ${cell.count} séance(s), ${cell.xp} XP`}
                  className="h-3 w-3 rounded-[3px] transition hover:ring-1 hover:ring-white/40"
                  style={{ background: LEVEL_COLORS[cell.level] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-white/40">
        <span>Moins</span>
        {LEVEL_COLORS.map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}
