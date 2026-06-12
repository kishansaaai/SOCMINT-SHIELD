/*
Domain & IP Intelligence — UI Card.
*/

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Globe, Award, Database, Key } from "lucide-react";

interface Props {
    apiKey: string;
    apiBase: string;
    defaultQuery?: string;
}

export default function DomainIntelCard({ apiKey, apiBase, defaultQuery = "" }: Props) {
    const [query, setQuery] = useState(defaultQuery);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const runScan = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setErr(null);
        setResult(null);
        try {
            const r = await fetch(`${apiBase}/api/domain/intel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ query: query.trim() }),
            });
            if (!r.ok) {
                const text = await r.text();
                throw new Error(`Server returned HTTP ${r.status}: ${text}`);
            }
            const data = await r.json();
            if (!data.valid) {
                setErr(data.error || "Query resolution failed");
            } else {
                setResult(data);
            }
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 60) return "#ef4444"; // Red
        if (score >= 25) return "#f59e0b"; // Orange
        return "#22c55e"; // Green
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-4"
        >
            <div className="flex items-center gap-2">
                <Globe className="text-cyan-400 w-5 h-5" />
                <h3 className="text-cyan-300 text-sm font-bold tracking-wider uppercase">
                    Domain & IP Intelligence
                </h3>
            </div>

            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter domain name or IP address (e.g., google.com or 8.8.8.8)"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                    onClick={runScan}
                    disabled={loading || !query.trim()}
                    className="px-4 py-1.5 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition-all font-semibold"
                >
                    {loading ? "Scanning..." : "Analyse"}
                </button>
            </div>

            {err && <div className="text-red-400 text-xs font-mono">⚠ {err}</div>}

            {result && (
                <div className="space-y-4 text-xs mt-2 fade-in">
                    {/* Header Details */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/40 rounded border border-slate-800/80">
                        <div>
                            <div className="text-slate-400 font-semibold">Query Target:</div>
                            <div className="font-mono text-cyan-400 mt-0.5">{result.query}</div>
                        </div>
                        <div>
                            <div className="text-slate-400 font-semibold">Target Type:</div>
                            <div className="font-mono text-slate-200 mt-0.5">
                                {result.is_ip ? "IP Address" : "Domain Name"}
                            </div>
                        </div>
                        {!result.is_ip && result.resolved_ip && (
                            <div className="col-span-2">
                                <div className="text-slate-400 font-semibold">Resolved IP (A Record):</div>
                                <div className="font-mono text-emerald-400 mt-0.5">{result.resolved_ip}</div>
                            </div>
                        )}
                    </div>

                    {/* Threat Score reputation */}
                    {result.reputation && (
                        <div
                            className="p-3 rounded border-l-2 bg-slate-950/20"
                            style={{
                                borderColor: getScoreColor(result.reputation.score),
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                                    <Shield
                                        style={{ color: getScoreColor(result.reputation.score) }}
                                        className="w-4 h-4"
                                    />
                                    <span>Reputation Status: </span>
                                    <span style={{ color: getScoreColor(result.reputation.score) }}>
                                        {result.reputation.status.toUpperCase()}
                                    </span>
                                </div>
                                <span
                                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                                    style={{
                                        background: getScoreColor(result.reputation.score),
                                        color: "#0f172a",
                                    }}
                                >
                                    RISK: {result.reputation.score}/100
                                </span>
                            </div>
                            {result.reputation.details?.length > 0 && (
                                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                                    {result.reputation.details.map((d: string, i: number) => (
                                        <li key={i}>{d}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Main grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* WHOIS/RDAP */}
                        {result.whois && (result.whois.registrar || result.whois.created) && (
                            <div className="bg-slate-950/30 border border-slate-800/80 rounded p-3 space-y-2">
                                <div className="flex items-center gap-1 text-cyan-400 font-bold border-b border-slate-800/60 pb-1.5">
                                    <Database className="w-3.5 h-3.5" />
                                    <span>WHOIS / RDAP REGISTRY</span>
                                </div>
                                <div className="space-y-1.5">
                                    {result.whois.registrar && (
                                        <div>
                                            <span className="text-slate-400">Registrar:</span>{" "}
                                            <span className="text-slate-200">{result.whois.registrar}</span>
                                        </div>
                                    )}
                                    {result.whois.created && (
                                        <div>
                                            <span className="text-slate-400">Created:</span>{" "}
                                            <span className="text-slate-200 font-mono">
                                                {new Date(result.whois.created).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {result.whois.expires && (
                                        <div>
                                            <span className="text-slate-400">Expires:</span>{" "}
                                            <span className="text-slate-200 font-mono">
                                                {new Date(result.whois.expires).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {result.whois.status?.length > 0 && (
                                        <div>
                                            <div className="text-slate-400 mb-1">Status Flags:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {result.whois.status.slice(0, 4).map((s: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Geolocation */}
                        {result.geolocation && result.geolocation.country && (
                            <div className="bg-slate-950/30 border border-slate-800/80 rounded p-3 space-y-2">
                                <div className="flex items-center gap-1 text-cyan-400 font-bold border-b border-slate-800/60 pb-1.5">
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>IP GEOLOCATION</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div>
                                        <span className="text-slate-400">Location:</span>{" "}
                                        <span className="text-slate-200">
                                            {result.geolocation.city}, {result.geolocation.regionName},{" "}
                                            {result.geolocation.country} ({result.geolocation.countryCode})
                                        </span>
                                    </div>
                                    {result.geolocation.isp && (
                                        <div>
                                            <span className="text-slate-400">ISP:</span>{" "}
                                            <span className="text-slate-200">{result.geolocation.isp}</span>
                                        </div>
                                    )}
                                    {result.geolocation.org && (
                                        <div>
                                            <span className="text-slate-400">Org:</span>{" "}
                                            <span className="text-slate-200">{result.geolocation.org}</span>
                                        </div>
                                    )}
                                    {result.geolocation.lat !== undefined && (
                                        <div>
                                            <span className="text-slate-400">Coordinates:</span>{" "}
                                            <span className="text-slate-200 font-mono">
                                                {result.geolocation.lat}, {result.geolocation.lon}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* DNS Records */}
                        {result.dns && result.dns.length > 0 && (
                            <div className="bg-slate-950/30 border border-slate-800/80 rounded p-3 space-y-2 col-span-1 md:col-span-2">
                                <div className="flex items-center gap-1 text-cyan-400 font-bold border-b border-slate-800/60 pb-1.5">
                                    <Award className="w-3.5 h-3.5" />
                                    <span>DNS RESOLUTION RECORDS ({result.dns.length})</span>
                                </div>
                                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                                    <table className="w-full text-left font-mono text-[10px] text-slate-300">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400">
                                                <th className="py-1 pr-2">TYPE</th>
                                                <th className="py-1 px-2">NAME</th>
                                                <th className="py-1 px-2">DATA / TARGET</th>
                                                <th className="py-1 pl-2">TTL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.dns.map((r: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-900/50 hover:bg-slate-850/50">
                                                    <td className="py-1 pr-2 text-cyan-400 font-bold">{r.type}</td>
                                                    <td className="py-1 px-2 truncate max-w-[120px]">{r.name}</td>
                                                    <td className="py-1 px-2 text-slate-200 truncate max-w-[200px]" title={r.data}>
                                                        {r.data}
                                                    </td>
                                                    <td className="py-1 pl-2 text-slate-500">{r.ttl}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SSL Certificate Forensics */}
                        {result.ssl && (result.ssl.issuer || result.ssl.subject) && (
                            <div className="bg-slate-950/30 border border-slate-800/80 rounded p-3 space-y-2 col-span-1 md:col-span-2">
                                <div className="flex items-center gap-1 text-cyan-400 font-bold border-b border-slate-800/60 pb-1.5">
                                    <Key className="w-3.5 h-3.5" />
                                    <span>SSL / TLS CERTIFICATE METADATA</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <div>
                                            <span className="text-slate-400">Common Name:</span>{" "}
                                            <span className="text-slate-200 font-mono">{result.ssl.subject}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Issuer Authority:</span>{" "}
                                            <span className="text-slate-200">{result.ssl.issuer}</span>
                                        </div>
                                        {result.ssl.serialNumber && (
                                            <div>
                                                <span className="text-slate-400">Serial Number:</span>{" "}
                                                <span className="text-slate-500 font-mono break-all text-[9px]">
                                                    {result.ssl.serialNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {result.ssl.notBefore && (
                                            <div>
                                                <span className="text-slate-400">Issued On:</span>{" "}
                                                <span className="text-slate-300 font-mono">{result.ssl.notBefore}</span>
                                            </div>
                                        )}
                                        {result.ssl.notAfter && (
                                            <div>
                                                <span className="text-slate-400">Expires On:</span>{" "}
                                                <span className="text-slate-300 font-mono">{result.ssl.notAfter}</span>
                                            </div>
                                        )}
                                        {result.ssl.days_remaining !== null && (
                                            <div>
                                                <span className="text-slate-400">Remaining Days:</span>{" "}
                                                <span
                                                    className="font-bold px-2 py-0.5 rounded"
                                                    style={{
                                                        background:
                                                            result.ssl.days_remaining < 30
                                                                ? "rgba(239, 68, 68, 0.15)"
                                                                : "rgba(34, 197, 94, 0.15)",
                                                        color:
                                                            result.ssl.days_remaining < 30
                                                                ? "#fca5a5"
                                                                : "#86efac",
                                                    }}
                                                >
                                                    {result.ssl.days_remaining} Days
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
