"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, UserCircle, User } from "iconoir-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Demographics {
  age: { name: string; value: number }[];
  gender: { name: string; value: number }[];
}

interface DemographicsCardProps {
  demographics: Demographics | null | undefined;
}

const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6", // blue-500
  female: "#ec4899", // pink-500
  unknown: "#94a3b8", // slate-400
};

export function DemographicsCard({ demographics }: DemographicsCardProps) {
  if (
    !demographics ||
    (!demographics.age?.length && !demographics.gender?.length)
  ) {
    return (
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white mt-4">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Demographics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center h-[200px] text-slate-500 flex-col gap-2">
          <UserCircle className="h-8 w-8 text-slate-300" />
          <p className="text-sm">Not enough demographic data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Format gender data
  const genderData = (demographics.gender || []).map((g) => ({
    name:
      g.name.toLowerCase() === "male"
        ? "Men"
        : g.name.toLowerCase() === "female"
          ? "Women"
          : "Unknown",
    value: g.value,
    color: GENDER_COLORS[g.name.toLowerCase()] || GENDER_COLORS.unknown,
  }));

  // Format age data (sort by age bracket to ensure proper order)
  const ageData = [...(demographics.age || [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white mt-4">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Demographics (Reach)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Age Chart */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">
            By Age
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageData}
                margin={{ top: 5, right: 10, bottom: 20, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  fontSize={12}
                  stroke="#64748b"
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Reach",
                  ]}
                />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Chart */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">
            By Gender
          </h4>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Reach",
                  ]}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry: any) => (
                    <span className="text-slate-600 text-sm font-medium ml-1">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
