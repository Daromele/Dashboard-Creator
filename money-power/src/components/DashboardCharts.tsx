"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, formatCentsCompact } from "@/lib/money";

const GROUP_COLORS: Record<string, string> = {
  Essential: "#302E2D",
  Flexible: "#C7A36D",
  Goals: "#B8C6B5",
};

export function GroupDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  const positive = data.filter((slice) => slice.value > 0);

  if (positive.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-body/70">
        No spending logged for this month yet.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={positive}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {positive.map((slice) => (
              <Cell key={slice.name} fill={GROUP_COLORS[slice.name] ?? "#EEDCD9"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatCents(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7DED6", fontSize: 13 }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value: string) => <span className="text-sm text-body">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlanVsActualBars({
  data,
}: {
  data: Array<{ category: string; plan: number; actual: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-body/70">
        Set category plans or log transactions to compare plan against actual.
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }} barGap={4}>
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "#494544" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
          />
          <YAxis
            tickFormatter={(value: number) => formatCentsCompact(value)}
            tick={{ fontSize: 11, fill: "#494544" }}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [formatCents(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7DED6", fontSize: 13 }}
            cursor={{ fill: "#F9F1EF" }}
          />
          <Legend formatter={(value: string) => <span className="text-sm text-body">{value}</span>} />
          <Bar dataKey="plan" name="Plan" fill="#B8C6B5" radius={[6, 6, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill="#302E2D" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
