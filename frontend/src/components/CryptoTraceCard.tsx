/*
Crypto Wallet Trace — UI card.
Auto-detect chain, show balance, transactions, risk flags, cluster.
*/

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
    apiKey: string;
    apiBase: string;
}

const CHAIN_COLOR: Record<string, string> = {
    btc: "#f7931a",
    eth: "#627eea",
    ltc: "#a6a9aa",
    doge: "#c2a633",
    bch: "#0ac18e",
    xrp: "#23292f",
    unknown: "#64748b",
};

export default function CryptoTraceCard({ apiKey, apiBase }: Props) {
    const [addr, setAddr] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const trace = async () => {
        if (!addr) return;
        setLoading(true);
        setErr(null);
        setResult(null);
        try {
            const r = await fetch(`${apiBase}/api/crypto/trace`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ address: addr.trim() }),
            });
            const data = await r.json();
            setResult(data);
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    const chain = result?.chain || "unknown";
    const color = CHAIN_COLOR[chain] || CHAIN_COLOR.unknown;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-3"
        >
            <h3 className="text-cyan-300 text-sm font-bold tracking-wider">
                CRYPTO WALLET TRACE
            </h3>

            <div className="flex gap-2">
                <input
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    placeholder="Paste BTC, ETH, LTC, DOGE, BCH, or XRP address"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono"
                />
                <button
                    onClick={trace}
                    disabled={loading || !addr}
                    className="px-3 py-1.5 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                    {loading ? "..." : "Trace"}
                </button>
            </div>

            {err && <div className="text-red-400 text-xs">{err}</div>}

            {result && (
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span
                            className="px-2 py-0.5 rounded font-bold"
                            style={{ background: color, color: "white" }}
                        >
                            {chain.toUpperCase()}
                        </span>
                        <span className={result.valid ? "text-emerald-400" : "text-red-400"}>
                            {result.valid ? "Valid address" : "Invalid format"}
                        </span>
                    </div>

                    {result.balance_btc !== null && result.balance_btc !== undefined && (
                        <div className="text-slate-200">
                            <span className="text-slate-400">Balance:</span>{" "}
                            <span className="font-mono">
                                {result.balance_btc.toFixed(8)} BTC
                            </span>
                            {result.balance_usd !== null && (
                                <span className="text-slate-400">
                                    {" "}(≈ ${result.balance_usd.toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}

                    {result.balance_eth !== null && result.balance_eth !== undefined && (
                        <div className="text-slate-200">
                            <span className="text-slate-400">Balance:</span>{" "}
                            <span className="font-mono">
                                {result.balance_eth.toFixed(6)} ETH
                            </span>
                            {result.balance_usd !== null && (
                                <span className="text-slate-400">
                                    {" "}(≈ ${result.balance_usd.toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}

                    {result.tx_count !== null && result.tx_count !== undefined && (
                        <div className="text-slate-300">
                            Transactions: <span className="font-mono">{result.tx_count}</span>
                        </div>
                    )}

                    {result.risk && result.risk.score > 0 && (
                        <div
                            className="p-2 rounded border-l-2"
                            style={{
                                borderColor:
                                    result.risk.verdict === "high" ? "#ef4444" : "#f59e0b",
                                background: "rgba(245,158,11,0.05)",
                            }}
                        >
                            <div className="text-amber-300 font-bold">
                                Risk: {result.risk.verdict} ({result.risk.score})
                            </div>
                            <ul className="text-slate-400 list-disc list-inside">
                                {result.risk.flags.map((f: string, i: number) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.transactions && result.transactions.length > 0 && (
                        <details className="text-slate-400">
                            <summary className="cursor-pointer">
                                {result.transactions.length} recent transaction(s)
                            </summary>
                            <div className="mt-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                                {result.transactions.slice(0, 10).map((tx: any, i: number) => (
                                    <div key={i} className="truncate text-slate-500">
                                        {tx.hash?.slice(0, 32)}...
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    {result.note && (
                        <div className="text-slate-500 text-[10px]">{result.note}</div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
