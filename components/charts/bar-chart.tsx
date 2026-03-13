"use client";

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  formatY?: (v: number) => string;
  horizontal?: boolean;
  colors?: string[];
}

const DEFAULT_COLOR = "#00ff88";

export function BarChart({ data, xKey, yKey, color = DEFAULT_COLOR, height = 280, formatY, horizontal = false, colors }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="1 4" stroke="#21262d" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 10, fill: "#484f58", fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={false} tickFormatter={formatY} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 10, fill: "#8b949e", fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={false} width={140} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#484f58", fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={{ stroke: "#21262d" }} />
            <YAxis tick={{ fontSize: 10, fill: "#484f58", fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={false} tickFormatter={formatY} width={45} />
          </>
        )}
        <Tooltip
          contentStyle={{ background: "#161b22", border: "1px solid #00ff8833", borderRadius: "6px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#c9d1d9" }}
          cursor={{ fill: "rgba(0, 255, 136, 0.04)" }}
          formatter={(value: unknown) => [formatY ? formatY(Number(value)) : Number(value).toLocaleString()]}
        />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]} maxBarSize={48}>
          {colors
            ? data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)
            : <Cell fill={color} />}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
