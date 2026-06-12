/*
Dark Web / Telegram Monitor — UI card.
Paste search + Telegram channel scrape + threat keyword score.
*/

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
    apiKey: string;
    apiBase: string;
    defaultQuery?: string;
}

const SEV_COLOR: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#10b981",
    none: "#64748b",
};

export default function DarkWebMonitor({ apiKey, apiBase, defaultQuery }: Props) {
    const [query, setQuery] = useState(defaultQuery || "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const run = async () => {
        if (!query) return;
        setLoading(true);
        setErr(null);
        setResult(null);
        try {
            const r = await fetch(`${apiBase}/api/darkweb/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ query: query.trim() }),
            });
            const data = await r.json();
            setResult(data);
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
            <h3 className="text-cyan-300 text-sm font-bold tracking-wider">
                DARK WEB / TELEGRAM MONITOR
            </h3>

            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="@username, channel name, paste ID, or keyword"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                />
                <button
                    onClick={run}
                    disabled={loading || !query}
                    className="px-3 py-1.5 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                    {loading ? "..." : "Scan"}
                </button>
            </div>

            {err && <div className="text-red-400 text-xs">{err}</div>}

            {result && (
                <div className="space-y-3 text-xs">
                    {/* Telegram */}
                    {result.telegram && (
                        <div>
                            <div className="text-slate-400 mb-1">
                                Telegram: {result.telegram.channel}
                                {result.telegram.title && (
                                    <span className="text-slate-300 ml-1">
                                        ({result.telegram.title})
                                    </span>
                                )}
                            </div>
                            {result.telegram.posts?.length > 0 ? (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {result.telegram.posts.slice(0, 5).map((p: any, i: number) => (
                                        <div key={i} className="p-1.5 rounded bg-slate-800/60 text-slate-300">
                                            {p.text || "(no text)"}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-500 text-[10px]">
                                    {result.telegram.error || "No posts found"}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pastes */}
                    {result.pastes && (
                        <div>
                            <div className="text-slate-400 mb-1">
                                Paste aggregators: {result.pastes.results.length} match(es)
                            </div>
                            {result.pastes.results.slice(0, 5).map((p: any, i: number) => (
                                <a
                                    key={i}
                                    href={p.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-1.5 rounded bg-slate-800/60 text-cyan-300 hover:text-cyan-100"
                                >
                                    {p.source}: {p.title || p.id}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Dark-web indicators */}
                    {result.darkweb_indicators && (
                        <div>
                            <div className="text-slate-400 mb-1">Dark-web indicators</div>
                            <div className="text-[10px] text-slate-300 space-y-0.5">
                                <div>Onion links: {result.darkweb_indicators.onion_links.length}</div>
                                <div>PGP blocks: {result.darkweb_indicators.pgp_blocks}</div>
                                <div>BTC addresses: {result.darkweb_indicators.btc_addresses.length}</div>
                                <div>ETH addresses: {result.darkweb_indicators.eth_addresses.length}</div>
                            </div>
                        </div>
                    )}

                    {/* Threat score */}
                    {result.threat_keywords && (
                        <div
                            className="p-2 rounded border-l-2"
                            style={{
                                borderColor: SEV_COLOR[result.threat_keywords.verdict],
                                background: "rgba(239,68,68,0.05)",
                            }}
                        >
                            <div
                                className="font-bold"
                                style={{ color: SEV_COLOR[result.threat_keywords.verdict] }}
                            >
                                Threat: {result.threat_keywords.verdict} (
                                {result.threat_keywords.score})
                            </div>
                            {Object.entries(result.threat_keywords.matches).map(([sev, kws]: any) =>
                                kws.length ? (
                                    <div key={sev} className="text-slate-400">
                                        <span className="uppercase text-[10px]">{sev}:</span>{" "}
                                        {kws.join(", ")}
                                    </div>
                                ) : null
                            )}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
