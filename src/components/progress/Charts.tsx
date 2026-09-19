"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Habillage commun des graphiques : mêmes couleurs, mêmes axes discrets,
 * même infobulle sombre — pour que toutes les courbes du site se lisent
 * comme un seul système.
 */
const AXIS = { stroke: "#5b5280", fontSize: 11 } as const;
const GRID = { stroke: "#241f3a", strokeDasharray: "3 3" } as const;

/** Formate une valeur d'infobulle en tolérant les types larges de Recharts. */
const fmt = (unit?: string) => (v: unknown) =>
  `${Number(v ?? 0).toLocaleString("fr-FR")}${unit ? ` ${unit}` : ""}`;

const tooltipStyle = {
  background: "#12101f",
  border: "1px solid #322b4d",
  borderRadius: 12,
  fontSize: 12,
  color: "#e9e6f5",
} as const;

export interface Point {
  label: string;
  value: number;
}

/** Courbe d'évolution cumulée (XP, volume cumulé…). */
export function AreaTrend({ data, color = "#a855f7", unit }: { data: Point[]; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmt(unit)(v), ""]}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${color.slice(1)})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Histogramme (volume par semaine, séances par mois…). */
export function Bars({ data, color = "#22d3ee", unit }: { data: Point[]; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          cursor={{ fill: "#ffffff08" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [fmt(unit)(v), ""]}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Courbe de progression d'un record. */
export function RecordLine({ data, color = "#a3e635", unit }: { data: Point[]; color?: string; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="label" {...AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} width={48} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmt(unit)(v), "Performance"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Radar de répartition du volume par groupe musculaire. */
export function GroupRadar({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#2b2545" />
        <PolarAngleAxis dataKey="label" tick={{ fill: "#8d84b5", fontSize: 10 }} />
        <Radar dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.35} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v ?? 0)} série(s)`, ""]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Histogramme horizontal coloré par groupe musculaire. */
export function ColoredBars({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" {...AXIS} tickLine={false} axisLine={false} width={96} />
        <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tooltipStyle} formatter={(v) => [String(v ?? 0), ""]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
