import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useJobgio } from '../../context/JobgioContext';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111111] text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-neutral-800">
        <p className="font-semibold text-neutral-300 mb-1">{label}</p>
        <p className="text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
          <span>Jobs Posted:</span>
          <span className="font-bold">
            {(payload[0].value / 1000).toFixed(1)}K ({payload[0].value.toLocaleString()})
          </span>
        </p>
        <p className="text-neutral-400 flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block"></span>
          <span>Applications:</span>
          <span className="font-bold text-neutral-300">
            {(payload[1].value / 1000).toFixed(1)}K ({payload[1].value.toLocaleString()})
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export const StatisticsChart: React.FC = () => {
  const { monthlyStats } = useJobgio();

  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 shadow-xs flex flex-col justify-between h-full">
      {/* Header & Legend */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#171717] tracking-tight">Statistics</h3>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-[#858585]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#171717]"></span>
            <span>Jobs Posted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4D4D8]"></span>
            <span>Applications</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[220px]">
        {/* Recharts Bar Chart */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyStats}
            margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F3F4F6"
            />
            <XAxis
              dataKey="shortMonth"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#858585', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#858585', fontSize: 11 }}
              tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
              ticks={[0, 2000, 4000, 6000, 8000]}
              domain={[0, 8000]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />

            {/* Jobs Posted - Near Black Bars */}
            <Bar
              dataKey="jobsPosted"
              fill="#171717"
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
            />

            {/* Applications - Soft Light Gray Bars */}
            <Bar
              dataKey="applications"
              fill="#D4D4D8"
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Highlight Pin Callout (August 6.4K) matching the screenshot */}
        <div
          className="absolute pointer-events-none flex flex-col items-center"
          style={{
            left: '64%', // Aligns above the 8th bar (August)
            top: '8px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-[#111111] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md tracking-tight">
            6.4K
          </div>
          <div className="w-1.5 h-1.5 bg-[#111111] rounded-full mt-0.5"></div>
        </div>
      </div>
    </div>
  );
};
