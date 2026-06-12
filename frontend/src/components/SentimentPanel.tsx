import React from "react";

interface SentimentData {
  overall_tone: string;
  overall_polarity: number;
  overall_subjectivity: number;
  platform_sentiments: Record<
    string,
    {
      polarity: number;
      subjectivity: number;
      tone: string;
    }
  >;
  top_keywords: string[];
  keyword_cloud_data: Record<string, number>;
  flagged_phrases: string[];
  total_text_analyzed: number;
}

interface SentimentPanelProps {
  data: SentimentData;
}

const TONE_COLORS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  POSITIVE: {
    bg: "rgba(34, 197, 94, 0.1)",
    text: "#22c55e",
    glow: "0 0 20px rgba(34, 197, 94, 0.4)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  AGGRESSIVE: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#ef4444",
    glow: "0 0 20px rgba(239, 68, 68, 0.4)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  PROMOTIONAL: {
    bg: "rgba(168, 85, 247, 0.1)",
    text: "#a855f7",
    glow: "0 0 20px rgba(168, 85, 247, 0.4)",
    border: "rgba(168, 85, 247, 0.3)",
  },
  NEUTRAL: {
    bg: "rgba(234, 179, 8, 0.1)",
    text: "#eab308",
    glow: "0 0 20px rgba(234, 179, 8, 0.4)",
    border: "rgba(234, 179, 8, 0.3)",
  },
};

export default function SentimentPanel({ data }: SentimentPanelProps) {
  if (!data) return null;

  const {
    overall_tone,
    overall_polarity,
    overall_subjectivity,
    platform_sentiments,
    keyword_cloud_data,
    flagged_phrases,
  } = data;

  const toneConfig = TONE_COLORS[overall_tone] || TONE_COLORS.NEUTRAL;

  // Keyword sizing calculations
  const frequencies = Object.values(keyword_cloud_data);
  const minFreq = frequencies.length ? Math.min(...frequencies) : 1;
  const maxFreq = frequencies.length ? Math.max(...frequencies) : 10;

  const getKeywordFontSize = (freq: number) => {
    if (maxFreq === minFreq) return "16px";
    const minSize = 12;
    const maxSize = 28;
    const size = minSize + ((freq - minFreq) / (maxFreq - minFreq)) * (maxSize - minSize);
    return `${Math.round(size)}px`;
  };

  const getKeywordColor = (freq: number) => {
    if (maxFreq === minFreq) return "#ffffff";
    const ratio = (freq - minFreq) / (maxFreq - minFreq);
    // Gradient from cyan (#00ffff) to white (#ffffff)
    // ratio = 1 (most frequent) -> cyan, ratio = 0 -> white
    const greenAndBlueHex = Math.round(255 - ratio * 0).toString(16).padStart(2, "0");
    const redHex = Math.round(255 - ratio * 255).toString(16).padStart(2, "0");
    return `#${redHex}ffff`;
  };

  return (
    <div className="space-y-6 mb-6 font-mono">
      {/* HEADER CARD */}
      <div className="glass-card p-6 border border-cyan-900/30">
        <div className="flex items-center space-x-2 mb-6 border-b border-cyan-900/20 pb-3">
          <span className="text-cyan-400">🧠</span>
          <h3 className="text-cyan-400 font-mono text-xs tracking-widest font-bold uppercase">
            SENTIMENT & TONE ANALYSIS
          </h3>
        </div>

        {/* Overall Tone Card */}
        <div
          className="p-6 rounded-lg text-center border flex flex-col items-center justify-center space-y-4"
          style={{
            backgroundColor: toneConfig.bg,
            borderColor: toneConfig.border,
            boxShadow: toneConfig.glow,
          }}
        >
          <div className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-semibold">
            Overall Classified Tone
          </div>
          <div
            className="text-3xl font-extrabold tracking-widest"
            style={{ color: toneConfig.text }}
          >
            {overall_tone}
          </div>

          <div className="flex space-x-12 pt-2 border-t border-cyan-950/20 w-full justify-center">
            <div className="text-center">
              <span className="block text-[10px] text-[#94a3b8] uppercase tracking-wider">
                Polarity Score
              </span>
              <span className="text-sm font-bold text-white">
                {overall_polarity >= 0 ? `+${overall_polarity}` : overall_polarity}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] text-[#94a3b8] uppercase tracking-wider">
                Subjectivity Score
              </span>
              <span className="text-sm font-bold text-white">
                {overall_subjectivity}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PER-PLATFORM TONES */}
        <div className="glass-card p-6 border border-cyan-900/30">
          <div className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 border-b border-cyan-900/10 pb-2">
            Per-Platform Tones
          </div>
          {Object.keys(platform_sentiments).length === 0 ? (
            <div className="text-xs text-[#94a3b8] py-8 text-center">
              No platform-specific content found to analyze.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(platform_sentiments).map(([platform, info]) => {
                const conf = TONE_COLORS[info.tone] || TONE_COLORS.NEUTRAL;
                return (
                  <div key={platform} className="flex items-center justify-between text-xs">
                    <span className="text-white font-semibold">{platform}</span>
                    <div className="flex items-center space-x-3 w-2/3">
                      <div className="flex-1 h-2 bg-[#020c1b] rounded-full overflow-hidden border border-cyan-950">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(info.polarity + 1) * 50}%`,
                            backgroundColor: conf.text,
                          }}
                        />
                      </div>
                      <span
                        className="font-bold text-[10px] px-2 py-0.5 rounded border uppercase"
                        style={{
                          color: conf.text,
                          borderColor: conf.border,
                          backgroundColor: conf.bg,
                        }}
                      >
                        {info.tone}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KEYWORD CLOUD */}
        <div className="glass-card p-6 border border-cyan-900/30 flex flex-col">
          <div className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 border-b border-cyan-900/10 pb-2">
            Keyword Cloud
          </div>
          {Object.keys(keyword_cloud_data).length === 0 ? (
            <div className="text-xs text-[#94a3b8] py-8 text-center flex-1">
              No keywords parsed.
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-3 justify-center items-center p-3 rounded bg-[#020c1b]/40 border border-cyan-950/40 flex-1">
              {Object.entries(keyword_cloud_data).map(([word, freq]) => (
                <span
                  key={word}
                  className="font-bold select-none cursor-default transition-all duration-200 hover:text-cyan-400"
                  style={{
                    fontSize: getKeywordFontSize(freq),
                    color: getKeywordColor(freq),
                  }}
                  title={`Frequency: ${freq}`}
                >
                  {word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLAGGED CONTENT */}
      <div className="glass-card p-6 border border-cyan-900/30">
        <div className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 border-b border-cyan-900/10 pb-2">
          Flagged Sentence Patterns
        </div>
        {flagged_phrases.length > 0 ? (
          <div className="border border-red-500/40 rounded p-4 bg-red-950/10 space-y-3">
            <h4 className="text-red-500 text-xs font-bold tracking-wider uppercase flex items-center space-x-1.5">
              <span>⚠</span> <span>Flagged Threat / Fraud Patterns Detected</span>
            </h4>
            <div className="space-y-2">
              {flagged_phrases.map((phrase, i) => (
                <div
                  key={i}
                  className="bg-red-950/20 border border-red-500/20 rounded p-2 text-xs text-red-300 leading-relaxed font-mono"
                >
                  &ldquo;{phrase}&rdquo;
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-green-500/30 rounded p-4 bg-green-950/10 text-green-400 text-xs font-bold flex items-center space-x-2">
            <span>✓</span> <span>No flagged phrases detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
