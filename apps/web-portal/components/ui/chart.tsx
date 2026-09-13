/**
 * Chart Components for Financial & Payroll Data Visualization
 * Uses canvas-based bar and line charts for better performance
 */

"use client";

import React from "react";

interface ChartDataPoint {
  label: string;
  value: number;
  fill?: string;
}

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  color?: string;
  className?: string;
}

interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  colors?: string[];
  className?: string;
  stacked?: boolean;
}

interface PieChartProps {
  data: ChartDataPoint[];
  title?: string;
  size?: number;
  className?: string;
}

/**
 * Line Chart Component - Shows trends over time
 */
export function LineChart({
  data,
  title,
  height = 300,
  color = "#3b82f6",
  className = "",
}: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 100 - 5; // percentage
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  const points = data.map((d, i) => ({
    x: padding / 10 + i * pointSpacing,
    y: padding + chartHeight - (d.value / maxValue) * chartHeight,
  }));

  return (
    <div className={`w-full ${className}`}>
      {title && <h3 className="text-sm font-semibold mb-2 text-gray-700">{title}</h3>}
      <svg width="100%" height={height} className="border border-gray-200 rounded bg-white">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`grid-${ratio}`}
            x1="40px"
            y1={padding + (1 - ratio) * chartHeight}
            x2="100%"
            y2={padding + (1 - ratio) * chartHeight}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={`label-${ratio}`}
            x="5"
            y={padding + (1 - ratio) * chartHeight + 5}
            fontSize="12"
            fill="#999"
          >
            KES {Math.round(maxValue * ratio).toLocaleString()}
          </text>
        ))}

        {/* Line */}
        <polyline
          points={data.map((_, i) => `${points[i]?.x}%,${points[i]?.y}px`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={`${p?.x}%`}
            cy={p?.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`x-label-${i}`}
            x={`${points[i]?.x}%`}
            y={height - 10}
            textAnchor="middle"
            fontSize="12"
            fill="#999"
          >
            {d.label.substring(0, 3)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/**
 * Bar Chart Component - Shows categorical data
 */
export function BarChart({
  data,
  title,
  height = 300,
  colors = ["#3b82f6"],
  className = "",
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 40;
  const chartHeight = height - padding * 2;
  const barWidth = 70 / data.length;
  const gapWidth = 30 / data.length;

  return (
    <div className={`w-full ${className}`}>
      {title && <h3 className="text-sm font-semibold mb-2 text-gray-700">{title}</h3>}
      <svg width="100%" height={height} className="border border-gray-200 rounded bg-white">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`grid-${ratio}`}
            x1="40px"
            y1={padding + (1 - ratio) * chartHeight}
            x2="100%"
            y2={padding + (1 - ratio) * chartHeight}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={`label-${ratio}`}
            x="5"
            y={padding + (1 - ratio) * chartHeight + 5}
            fontSize="12"
            fill="#999"
          >
            KES {Math.round(maxValue * ratio).toLocaleString()}
          </text>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding / 10 + (barWidth + gapWidth) * i + gapWidth / 2;
          const y = padding + chartHeight - barHeight;
          const barColor = d.fill || colors[i % colors.length];

          return (
            <g key={`bar-${i}`}>
              <rect
                x={`${x}%`}
                y={y}
                width={`${barWidth}%`}
                height={barHeight}
                fill={barColor}
                rx="4"
              />
              {/* Value label on top of bar */}
              <text
                x={`${x + barWidth / 2}%`}
                y={y - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
                fontWeight="500"
              >
                {(d.value / 1000).toFixed(1)}k
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding / 10 + (barWidth + gapWidth) * i + gapWidth / 2 + barWidth / 2;
          return (
            <text
              key={`x-label-${i}`}
              x={`${x}%`}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#999"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Pie Chart Component - Shows proportion breakdown
 */
export function PieChart({ data, title, size = 200, className = "" }: PieChartProps) {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    currentAngle = endAngle;

    return {
      path: pathData,
      color: d.fill || colors[i % colors.length],
      label: d.label,
      percentage: ((d.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {title && <h3 className="text-sm font-semibold mb-2 text-gray-700">{title}</h3>}
      <svg width={size} height={size} className="mb-4">
        {slices.map((slice, i) => (
          <path
            key={`slice-${i}`}
            d={slice?.path}
            fill={slice?.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {slices.map((slice, i) => (
          <div key={`legend-${i}`} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-xs text-gray-600">
              {slice.label} {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Summary Stats Cards
 */
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  trend?: number; // percentage change
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export function StatCard({ label, value, subtext, icon, color = "blue", trend }: StatCardProps) {
  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-4 flex items-start justify-between`}
    >
      <div className="flex-1">
        <p className="text-sm font-medium opacity-75">{label}</p>
        <p className="text-2xl font-bold mt-1">
          {typeof value === "number" ? `$${value.toLocaleString()}` : value}
        </p>
        {subtext && <p className="text-xs opacity-60 mt-1">{subtext}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last month
          </p>
        )}
      </div>
      {icon && <div className="text-3xl opacity-20">{icon}</div>}
    </div>
  );
}
