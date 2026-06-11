import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getHeaders, API_BASE } from '../config';

interface Props {
  profileData: any;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ActivityHeatmap({ profileData }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileData) return;
    
    fetch(`${API_BASE}/api/timeline`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ profile_data: profileData })
    })
    .then(r => r.json())
    .then(d => {
      setData(d.activity_heatmap);
      setLoading(false);
    })
    .catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [profileData]);

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-cyan-900/40 rounded-xl p-6 mt-6 animate-pulse">
        <div className="h-4 w-48 bg-cyan-900/50 rounded mb-4"></div>
        <div className="h-24 w-full bg-slate-800/50 rounded"></div>
      </div>
    );
  }

  if (!data || !data.matrix) return null;

  const getColor = (count: number) => {
    if (count === 0) return '#0f172a';
    if (count === 1) return '#164e63';
    if (count >= 2 && count <= 3) return '#0891b2';
    return '#00ffff';
  };

  const barData = data.hourly_totals.map((count: number, hour: number) => ({
    hour: `${hour}:00`,
    count
  }));

  return (
    <div className="bg-slate-900/80 border border-cyan-900/40 rounded-xl p-6 mt-6">
      
      {/* SECTION A: GitHub-style Heatmap */}
      <div className="mb-10">
        <h3 className="text-sm font-bold tracking-widest uppercase text-cyan-400 mb-6">POSTING ACTIVITY HEATMAP</h3>
        
        <div className="flex">
          {/* Day Labels */}
          <div className="flex flex-col gap-1 mr-4 mt-6">
            {DAYS_SHORT.map(day => (
              <div key={day} className="text-[10px] text-slate-500 font-mono h-4 flex items-center">{day}</div>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            {/* Hour Labels */}
            <div className="flex gap-1 mb-2">
              {HOURS.map(h => (
                <div key={h} className="w-4 flex justify-center text-[9px] text-slate-500 font-mono">
                  {h % 3 === 0 ? h : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex flex-col gap-1">
              {data.matrix.map((dayData: number[], dayIndex: number) => (
                <div key={dayIndex} className="flex gap-1">
                  {dayData.map((count: number, hourIndex: number) => (
                    <div 
                      key={hourIndex}
                      className="w-4 h-4 rounded-sm cursor-pointer hover:ring-1 hover:ring-cyan-400 transition-all"
                      style={{ backgroundColor: getColor(count) }}
                      title={`${count} posts — ${DAYS[dayIndex]} ${hourIndex}:00`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs font-mono text-cyan-400">
          Peak activity: {data.peak_day} at {data.peak_hour}:00
        </div>
      </div>

      {/* SECTION B: Hourly Bar Chart */}
      <div>
        <h3 className="text-sm font-bold tracking-widest uppercase text-cyan-400 mb-6">HOURLY ACTIVITY DISTRIBUTION</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#1e293b' }} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #0891b2', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Bar dataKey="count" fill="#00ffff" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
