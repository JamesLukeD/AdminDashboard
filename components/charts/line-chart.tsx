"use client";

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LineChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  lines: { key: string; color: string; label: string; }[];
  xKey: string;
  height?: number;
  formatY?: (v: number) => string;
  formatTooltip?: (v: number) => string;
}

export function LineChart({ data, lines, xKey, height = 280, formatY, formatTooltip }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="1 4" stroke="#21262d" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: "#484f58", fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#21262d" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#484f58", fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatY}
          width={45}
        />
        <Tooltip
          contentStyle={{ background: "#161b22", border: "1px solid #00ff8833", borderRadius: "6px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#c9d1d9" }}
          labelStyle={{ color: "#8b949e", fontSize: "10px" }}
          formatter={(value: unknown, name: unknown) => [
            formatTooltip ? formatTooltip(Number(value)) : Number(value).toLocaleString(),
            String(name),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }} />
        {lines.map((l) => (
          <Line
            key={String(l.key)}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            name={l.label}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: l.color, stroke: "#0a0e14", strokeWidth: 2 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
