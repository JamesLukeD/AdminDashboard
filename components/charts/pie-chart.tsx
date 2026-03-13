"use client";

import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PieChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  nameKey: string;
  valueKey: string;
  colors?: string[];
  height?: number;
  innerRadius?: number;
}

const DEFAULT_COLORS = [
  "#00ff88", "#79c0ff", "#e3b341", "#ff7b72", "#d2a8ff",
  "#ffa657", "#56d364", "#39d0d4",
];

export function PieChart({ data, nameKey, valueKey, colors = DEFAULT_COLORS, height = 260, innerRadius = 60 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RePieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={innerRadius + 40} dataKey={valueKey} nameKey={nameKey} paddingAngle={2}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#161b22", border: "1px solid #00ff8833", borderRadius: "6px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "#c9d1d9" }}
          formatter={(value: unknown) => [Number(value).toLocaleString()]}
        />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }} />
      </RePieChart>
    </ResponsiveContainer>
  );
}
