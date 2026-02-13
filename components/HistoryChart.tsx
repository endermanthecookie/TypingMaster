
import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TypingResult } from '../types';

interface HistoryChartProps {
  history: TypingResult[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ history }) => {
  const data = [...history].reverse().map((item, idx) => ({
    name: idx + 1,
    wpm: item.wpm,
    accuracy: item.accuracy
  }));

  if (history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 italic border border-slate-800 rounded-xl bg-slate-900/20">
        Complete a race to see your performance graph
      </div>
    );
  }

  return (
    <div className="h-64 w-full min-h-[200px] bg-slate-900/20 rounded-xl border border-slate-800/50 p-2 overflow-hidden flex flex-col justify-center">
      <ResponsiveContainer width="100%" height="100%" minHeight={180}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Area 
            type="monotone" 
            dataKey="wpm" 
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorWpm)" 
            isAnimationActive={true}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
