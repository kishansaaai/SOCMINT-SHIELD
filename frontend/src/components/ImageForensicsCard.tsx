/*
SOCMINT Shield — Image Forensics Card
Cross-platform avatar duplicate detection, reverse search, EXIF.

Usage in App.tsx:
    import ImageForensicsCard from './components/ImageForensicsCard';
    <ImageForensicsCard avatars={avatars} apiKey={apiKey} />
*/

import { useState } from "react";
import { motion } from "framer-motion";

interface Avatar {
    platform: string;
    url: string;
    label?: string;
}

interface Props {
    avatars: Avatar[];
    apiKey: string;
    apiBase: string;
}

const ACCENT = "#22d3ee";
const HIGH = "#ef4444";
const MED = "#f59e0b";
const LOW = "#10b981";

export default function ImageForensicsCard({ avatars, apiKey, apiBase }: Props) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const runDuplicates = async () => {
        if (!avatars.length) {
            setErr("No avatars supplied");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const r = await fetch(`${apiBase}/api/image/duplicates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ avatars, hamming_threshold: 6 }),
            });
            const data = await r.json();
            setResult(data);
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    const reverseSearch = async (url: string) => {
        setLoading(true);
        try {
            const r = await fetch(`${apiBase}/api/image/reverse`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ image_url: url }),
            });
            const data = await r.json();
            setResult({ reverse: data });
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-3"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-cyan-300 text-sm font-bold tracking-wider">
                    IMAGE FORENSICS
                </h3>
                <span className="text-xs text-slate-500">
                    {avatars.length} avatar{avatars.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={runDuplicates}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                    {loading ? "..." : "Detect Duplicate Avatars"}
                </button>
                {avatars[0] && (
                    <button
                        onClick={() => reverseSearch(avatars[0].url)}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs rounded border border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-50"
                    >
                        Reverse-Search First
                    </button>
                )}
            </div>

            {err && <div className="text-red-400 text-xs">{err}</div>}

            {result && (
                <div className="space-y-3 text-xs">
                    {result.pairs && result.pairs.length > 0 && (
                        <div>
                            <div className="text-slate-400 mb-1">
                                {result.count} duplicate pair(s) found
                            </div>
                            <div className="space-y-1">
                                {result.pairs.map((p: any, i: number) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 p-2 rounded bg-slate-800/60"
                                    >
                                        <span
                                            className="px-2 py-0.5 rounded"
                                            style={{
                                                background:
                                                    p.hamming <= 4 ? HIGH : MED,
                                                color: "white",
                                            }}
                                        >
                                            d={p.hamming}
                                        </span>
                                        <span className="text-slate-300">
                                            {p.a.platform} ↔ {p.b.platform}
                                        </span>
                                        <span
                                            className={
                                                p.hamming <= 4
                                                    ? "text-red-300"
                                                    : "text-amber-300"
                                            }
                                        >
                                            ({p.verdict})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.reverse && (
                        <div>
                            <div className="text-slate-400 mb-1">
                                Reverse-search result
                            </div>
                            {result.reverse.best_guess && (
                                <div className="text-cyan-300 mb-1">
                                    Best guess: "{result.reverse.best_guess}"
                                </div>
                            )}
                            {result.reverse.google?.length > 0 && (
                                <ul className="list-disc list-inside text-slate-300">
                                    {result.reverse.google.slice(0, 5).map((t: string, i: number) => (
                                        <li key={i}>{t}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {result.clusters && result.pairs?.length === 0 && (
                        <div className="text-emerald-300">
                            No duplicate avatars detected
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
