import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface HeatmapData {
  matrix: number[][]; // 7 days x 24 hours
  peak_hour: number;
  peak_day: string;
  peak_day_index: number;
  hourly_totals: number[];
  daily_totals: number[];
  active_hours: number[];
  total_timestamped: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    count: number;
    dayIndex: number;
    hour: number;
  } | null>(null);

  if (!data || !data.matrix) {
    return (
      <div className="glass-card p-6 text-center text-cyan-500/50 font-mono text-xs">
        No temporal data available to compile activity heatmap.
      </div>
    );
  }

  const { matrix, peak_hour, peak_day, hourly_totals } = data;

  // Determine cell color
  const getCellColor = (count: number) => {
    if (count === 0) return "#0f172a";
    if (count === 1) return "#164e63";
    if (count >= 2 && count <= 3) return "#0891b2";
    return "#00ffff";
  };

  // Prepare chart data for Section B
  const chartData = hourly_totals.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, "0")}:00`,
    count,
  }));

  // Heatmap rendering helpers
  const hoursLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="space-y-8 mb-6">
      {/* SECTION A: DAY/HOUR HEATMAP */}
      <div className="glass-card p-6 relative overflow-hidden border border-cyan-900/30">
        <div className="flex items-center space-x-2 mb-6 border-b border-cyan-900/20 pb-3">
          <span className="text-cyan-400">📅</span>
          <h3 className="text-cyan-400 font-mono text-xs tracking-widest font-bold uppercase">
            POSTING ACTIVITY HEATMAP
          </h3>
        </div>

        {/* Heatmap Grid container */}
        <div className="overflow-x-auto py-2">
          <div className="min-w-[550px] relative select-none">
            {/* Hour headers row */}
            <div className="flex pl-10 mb-2">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center font-mono text-[8px] text-cyan-600/70"
                >
                  {hoursLabels.includes(hour) ? `${hour}h` : ""}
                </div>
              ))}
            </div>

            {/* Days rows */}
            <div className="space-y-1.5">
              {matrix.map((row, dayIndex) => (
                <div key={dayIndex} className="flex items-center">
                  {/* Day label */}
                  <span className="w-10 font-mono text-[10px] text-cyan-500/70 font-semibold uppercase">
                    {DAYS[dayIndex]}
                  </span>

                  {/* Grid cells */}
                  <div className="flex-1 flex gap-1.5">
                    {row.map((count, hour) => {
                      const isHovered =
                        hoveredCell &&
                        hoveredCell.dayIndex === dayIndex &&
                        hoveredCell.hour === hour;
                      return (
                        <div
                          key={hour}
                          className="flex-1 aspect-square rounded-[2px] cursor-crosshair transition-all duration-150 border border-transparent hover:scale-110"
                          style={{
                            backgroundColor: getCellColor(count),
                            borderColor: isHovered ? "#00ffff" : "transparent",
                            boxShadow: isHovered ? "0 0 8px #00ffff" : "none",
                          }}
                          onMouseEnter={() =>
                            setHoveredCell({ count, dayIndex, hour })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover Tooltip Overlay */}
        <div className="mt-4 h-6 flex items-center justify-between">
          <div className="text-[10px] font-mono text-cyan-400/80">
            {hoveredCell ? (
              <span className="animate-pulse">
                ⚡ {hoveredCell.count} post{hoveredCell.count !== 1 ? "s" : ""} —{" "}
                {FULL_DAYS[hoveredCell.dayIndex]} {hoveredCell.hour.toString().padStart(2, "0")}:00
              </span>
            ) : (
              <span className="text-cyan-600/60">Hover over cells to analyze specific post counts.</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
            Peak activity: <span className="underline">{peak_day}</span> at <span className="underline">{peak_hour}:00</span>
          </div>
        </div>
      </div>

      {/* SECTION B: RECHARTS BAR CHART */}
      <div className="glass-card p-6 border border-cyan-900/30">
        <div className="flex items-center space-x-2 mb-6 border-b border-cyan-900/20 pb-3">
          <span className="text-cyan-400">📊</span>
          <h3 className="text-cyan-400 font-mono text-xs tracking-widest font-bold uppercase">
            HOURLY ACTIVITY DISTRIBUTION
          </h3>
        </div>

        <div className="h-48 w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#0891b2" }}
              />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#0891b2" }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#0a1628",
                  borderColor: "rgba(0, 255, 255, 0.3)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontFamily: "monospace",
                }}
                cursor={{ fill: "rgba(0, 255, 255, 0.05)" }}
              />
              <Bar
                dataKey="count"
                fill="#00ffff"
                radius={[4, 4, 0, 0]}
                fillOpacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
