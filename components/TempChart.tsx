'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKST } from '@/lib/time';

export type TimelinePoint = { at: string; temp: number };

export default function TempChart({ data }: { data: TimelinePoint[] }) {
  const max = Math.max(55, ...data.map(d => d.temp));
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="at"
            tickFormatter={v => formatKST(v)}
            interval={5}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis domain={[20, Math.ceil(max / 5) * 5]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <ReferenceLine y={50} stroke="#B91C1C" strokeDasharray="4 4" />
          <Tooltip labelFormatter={v => formatKST(v as string)} formatter={v => [`${v}°C`, '온도']} />
          <Line type="monotone" dataKey="temp" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
