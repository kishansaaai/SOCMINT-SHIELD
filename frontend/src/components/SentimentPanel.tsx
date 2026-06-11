import React, { useState, useEffect } from 'react';
import { getHeaders, API_BASE } from '../config';

interface Props {
  profileData: any;
}

export default function SentimentPanel({ profileData }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileData) return;
    
    fetch(`${API_BASE}/api/sentiment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ profile_data: profileData })
    })
    .then(r => r.json())
    .then(d => {
      setData(d);
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

  if (!data) return null;

  const getToneColor = (tone: string) => {
    if (tone.includes('HOSTILE')) return 'text-red-500 border-red-500/30 bg-red-500/10';
    if (tone.includes('POSITIVE')) return 'text-green-500 border-green-500/30 bg-green-500/10';
    return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
  };

  const getIndexColor = (index: number) => {
    if (index > 10) return 'text-green-400';
    if (index < -10) return 'text-red-400';
    return 'text-cyan-400';
  };

  const indexPercent = (data.sentiment_index + 100) / 2; // -100..100 -> 0..100

  // Find max/min frequency for word cloud scaling
  const maxFreq = data.top_keywords?.length ? Math.max(...data.top_keywords.map((k: any) => k.value)) : 1;
  const minFreq = data.top_keywords?.length ? Math.min(...data.top_keywords.map((k: any) => k.value)) : 1;

  return (
    <div className="bg-slate-900/80 border border-cyan-900/40 rounded-xl p-6 mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      
      <div className="flex items-center gap-3 mb-6 border-b border-cyan-900/30 pb-3 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-lg">
          🧠
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-widest uppercase text-cyan-400">Psycholinguistic Analysis</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Tone, Sentiment & Keyword Profiling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Left Column: Overall Tone */}
        <div className="flex flex-col gap-4">
          <div className="p-4 border border-slate-800 rounded-lg bg-slate-950/50 text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Dominant Tone</div>
            <div className={`inline-block px-4 py-2 rounded-full border text-sm font-bold tracking-widest ${getToneColor(data.overall_tone)}`}>
              {data.overall_tone}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-400 border border-slate-800 rounded-lg bg-slate-950/50 p-4">
            <div>Items Analyzed:</div>
            <div className="font-mono text-cyan-400 font-bold">{data.items_analyzed}</div>
          </div>

          <div className="p-4 border border-slate-800 rounded-lg bg-slate-950/50">
            <div className="flex justify-between items-end mb-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Sentiment Index</div>
              <div className={`font-mono font-bold text-lg ${getIndexColor(data.sentiment_index)}`}>
                {data.sentiment_index > 0 ? '+' : ''}{data.sentiment_index}
              </div>
            </div>
            
            {/* Index Bar */}
            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-red-500 via-slate-400 to-green-500 w-full opacity-50"
              />
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white]"
                style={{ left: `${Math.max(0, Math.min(100, indexPercent))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono uppercase tracking-wider">
              <span>Hostile</span>
              <span>Neutral</span>
              <span>Friendly</span>
            </div>
          </div>

        </div>

        {/* Right Column: Keyword Cloud & Flagged Content */}
        <div className="flex flex-col gap-4">
          {/* Keyword Cloud */}
          <div className="p-4 border border-slate-800 rounded-lg bg-slate-950/50 h-full">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Top Keywords Cloud</div>
            <div className="flex flex-wrap gap-3 items-center justify-center min-h-[100px]">
              {data.top_keywords?.length > 0 ? (
                data.top_keywords.map((kw: any, idx: number) => {
                  // Scale from 10px to 24px based on relative frequency
                  const size = maxFreq > minFreq 
                    ? 10 + ((kw.value - minFreq) / (maxFreq - minFreq)) * 14
                    : 14;
                  return (
                    <span 
                      key={idx} 
                      style={{ fontSize: `${size}px` }} 
                      className="text-cyan-400/80 hover:text-cyan-300 transition-colors font-bold"
                      title={`Frequency: ${kw.value}`}
                    >
                      {kw.text}
                    </span>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500">No sufficient text data for keyword cloud.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flagged Content Alert Box */}
      {data.flagged_phrases?.length > 0 && (
        <div className="mt-6 border-2 border-red-500/50 bg-red-950/30 rounded-lg p-5 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-red-500 text-lg animate-pulse">⚠</div>
            <div className="text-red-400 font-bold tracking-widest text-sm">FLAGGED CONTENT DETECTED</div>
          </div>
          <div className="text-xs text-slate-400 mb-4">
            Highly negative or potentially hostile phrases were detected in the profile text:
          </div>
          <ul className="space-y-3">
            {data.flagged_phrases.map((phrase: string, idx: number) => (
              <li key={idx} className="bg-slate-900/50 p-3 rounded border border-red-900/30 text-xs text-red-200 font-mono italic">
                "{phrase}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
