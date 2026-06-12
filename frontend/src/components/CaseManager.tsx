/*
Case Manager — list, create, snapshot, view cases.
*/

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
    apiKey: string;
    apiBase: string;
    officer: string;
}

interface Case {
    id: string;
    title: string;
    target: string;
    target_type: string;
    officer: string;
    status: string;
    created_at: number;
    updated_at: number;
    snapshots: any[];
    shared_with: string[];
    notes: string;
    chain_of_custody: any[];
}

const STATUS_COLOR: Record<string, string> = {
    open: "#3b82f6",
    active: "#10b981",
    "pending-review": "#f59e0b",
    closed: "#64748b",
};

export default function CaseManager({ apiKey, apiBase, officer }: Props) {
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState<Case | null>(null);
    const [newTarget, setNewTarget] = useState("");
    const [newType, setNewType] = useState("username");
    const [newTitle, setNewTitle] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const list = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${apiBase}/api/case/list`, {
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await r.json();
            setCases(data.cases || []);
        } catch (e: any) {
            setErr(e.message);
        }
        setLoading(false);
    };

    useEffect(() => { list(); }, []);

    const createCase = async () => {
        if (!newTarget) return;
        try {
            const r = await fetch(`${apiBase}/api/case/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    target: newTarget,
                    target_type: newType,
                    case_title: newTitle,
                    notes: newNotes,
                    officer,
                    shared_with: [],
                }),
            });
            if (r.ok) {
                setShowCreate(false);
                setNewTarget("");
                setNewTitle("");
                setNewNotes("");
                list();
            } else {
                const data = await r.json();
                setErr(data.detail || "Create failed");
            }
        } catch (e: any) {
            setErr(e.message);
        }
    };

    const viewCase = async (id: string) => {
        const r = await fetch(`${apiBase}/api/case/${id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await r.json();
        setSelected(data);
    };

    const setStatus = async (id: string, status: string) => {
        await fetch(`${apiBase}/api/case/${id}/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ officer, status }),
        });
        list();
    };

    const verify = async (id: string) => {
        const r = await fetch(`${apiBase}/api/case/${id}/verify`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await r.json();
        alert(
            data.ok
                ? `✓ Chain-of-custody intact (${data.events} events)`
                : `✗ Tampering detected at event ${data.broken_at_index}`
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-3"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-cyan-300 text-sm font-bold tracking-wider">
                    CASE MANAGER
                </h3>
                <button
                    onClick={() => setShowCreate((s) => !s)}
                    className="px-2 py-1 text-xs rounded border border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                >
                    {showCreate ? "Cancel" : "+ New Case"}
                </button>
            </div>

            {showCreate && (
                <div className="space-y-2 p-3 rounded bg-slate-800/60">
                    <input
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        placeholder="Target (username / name / phone)"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                        >
                            <option value="username">Username</option>
                            <option value="real_name">Real name</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="wallet">Crypto wallet</option>
                        </select>
                        <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Case title"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                        />
                    </div>
                    <textarea
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Initial notes"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs"
                        rows={2}
                    />
                    <button
                        onClick={createCase}
                        className="px-3 py-1.5 text-xs rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    >
                        Create Case
                    </button>
                </div>
            )}

            {err && <div className="text-red-400 text-xs">{err}</div>}

            {loading && <div className="text-slate-500 text-xs">Loading...</div>}

            <div className="space-y-1 max-h-64 overflow-y-auto">
                {cases.map((c) => (
                    <div
                        key={c.id}
                        className="p-2 rounded bg-slate-800/40 hover:bg-slate-800/70 cursor-pointer"
                        onClick={() => viewCase(c.id)}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-cyan-300 font-mono text-[10px]">
                                {c.id}
                            </span>
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                    background: STATUS_COLOR[c.status] || "#64748b",
                                    color: "white",
                                }}
                            >
                                {c.status}
                            </span>
                        </div>
                        <div className="text-xs text-slate-200 mt-0.5">{c.title}</div>
                        <div className="text-[10px] text-slate-500">
                            Officer: {c.officer} • {c.snapshots.length} snapshot(s)
                        </div>
                    </div>
                ))}
                {cases.length === 0 && !loading && (
                    <div className="text-slate-500 text-xs">No cases yet</div>
                )}
            </div>

            {selected && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 p-3 rounded border border-cyan-500/30 bg-slate-900/80 space-y-2"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-cyan-300 font-mono text-xs">
                                {selected.id}
                            </div>
                            <div className="text-slate-200 text-sm">{selected.title}</div>
                        </div>
                        <button
                            onClick={() => setSelected(null)}
                            className="text-slate-500 hover:text-slate-300"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatus(selected.id, "active")}
                            className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300"
                        >
                            Mark Active
                        </button>
                        <button
                            onClick={() => setStatus(selected.id, "pending-review")}
                            className="px-2 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300"
                        >
                            Pending Review
                        </button>
                        <button
                            onClick={() => setStatus(selected.id, "closed")}
                            className="px-2 py-0.5 text-[10px] rounded bg-slate-500/20 text-slate-300"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => verify(selected.id)}
                            className="px-2 py-0.5 text-[10px] rounded bg-fuchsia-500/20 text-fuchsia-300"
                        >
                            Verify Chain
                        </button>
                    </div>

                    {selected.notes && (
                        <div className="text-xs text-slate-300">
                            <span className="text-slate-500">Notes:</span> {selected.notes}
                        </div>
                    )}

                    <div className="text-xs text-slate-400">
                        Chain of custody: {selected.chain_of_custody.length} event(s)
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
