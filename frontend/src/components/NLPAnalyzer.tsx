/*
NLP Analyzer — sentiment, threat keywords, entities, language detection.
*/

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
    apiKey: string;
    apiBase: string;
    defaultText?: string;
}

const VERDICT_COLOR: Record<string, string> = {
    critical: "#ef4444",
    elevated: "#f97316",
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#94a3b8",
    unavailable: "#64748b",
    none: "#64748b",
};

export default function NLPAnalyzer({ apiKey, apiBase, defaultText }: Props) {
    const [text, setText] = useState(defaultText || "");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const analyze = async () => {
        if (!text.trim()) return;
        setLoading(true);
        const r = await fetch(`${apiBase}/api/nlp/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ text }),
        });
        const data = await r.json();
        setResult(data);
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-3"
        >
            <h3 className="text-cyan-300 text-sm font-bold tracking-wider">
                MULTILINGUAL NLP ANALYZER
            </h3>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste social-media text — supports English, Hindi, Kannada, Tamil, Telugu, Bengali, Urdu"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                rows={4}
            />

            <button
                onClick={analyze}
                disabled={loading || !text.trim()}
                className="px-3 py-1.5 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
            >
                {loading ? "Analyzing..." : "Analyze"}
            </button>

            {result && (
                <div className="space-y-2 text-xs">
                    <div>
                        <span className="text-slate-400">Language:</span>{" "}
                        <span className="text-cyan-300">
                            {result.language?.name} ({result.language?.code})
                        </span>
                    </div>

                    {result.sentiment && (
                        <div>
                            <span className="text-slate-400">Sentiment:</span>{" "}
                            <span
                                style={{ color: VERDICT_COLOR[result.sentiment.label] }}
                            >
                                {result.sentiment.label}
                            </span>
                            {result.sentiment.compound !== null && (
                                <span className="text-slate-500">
                                    {" "}({result.sentiment.compound.toFixed(2)})
                                </span>
                            )}
                        </div>
                    )}

                    {result.threat && result.threat.verdict !== "none" && (
                        <div
                            className="p-2 rounded border-l-2"
                            style={{
                                borderColor: VERDICT_COLOR[result.threat.verdict] || "#f59e0b",
                                background: "rgba(239,68,68,0.05)",
                            }}
                        >
                            <div
                                className="font-bold"
                                style={{ color: VERDICT_COLOR[result.threat.verdict] }}
                            >
                                Threat: {result.threat.verdict} ({result.threat.score})
                            </div>
                            {Object.entries(result.threat.matches).map(([cat, kws]: any) =>
                                kws.length ? (
                                    <div key={cat} className="text-slate-400">
                                        <span className="text-[10px] uppercase">{cat}:</span>{" "}
                                        {kws.join(", ")}
                                    </div>
                                ) : null
                            )}
                        </div>
                    )}

                    {result.entities && (
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                            {result.entities.emails.length > 0 && (
                                <div>Emails: {result.entities.emails.join(", ")}</div>
                            )}
                            {result.entities.phones.length > 0 && (
                                <div>Phones: {result.entities.phones.join(", ")}</div>
                            )}
                            {result.entities.handles.length > 0 && (
                                <div>Handles: {result.entities.handles.join(", ")}</div>
                            )}
                            {result.entities.hashtags.length > 0 && (
                                <div>Hashtags: {result.entities.hashtags.join(", ")}</div>
                            )}
                            {result.entities.urls.length > 0 && (
                                <div>URLs: {result.entities.urls.length}</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
