/*
Face Recognition & Name Scan Card.
*/

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ShieldAlert, Sparkles, User, RefreshCw, Upload, Globe } from "lucide-react";

interface Props {
    apiKey: string;
    apiBase: string;
}

const PLATFORM_ICONS: Record<string, string> = {
    GitHub: "⌨️", Reddit: "🔴", "Twitter/X": "𝕏", Instagram: "📸",
    YouTube: "▶️", TikTok: "🎵", LinkedIn: "💼", Telegram: "✈️",
    HackerNews: "🧡", "Dev.to": "👩‍💻", GitLab: "🦊", Tumblr: "📝",
    Medium: "✍️", Pinterest: "📌", SoundCloud: "🎧", Steam: "🎮",
    Pastebin: "📋", Flickr: "📷", Quora: "❓", Snapchat: "👻",
};

export default function FaceScanCard({ apiKey, apiBase }: Props) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [scanStep, setScanStep] = useState(0);
    const [imageB64, setImageB64] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const SCAN_STEPS = [
        "Initializing camera frame capture...",
        "Extracting face coordinates & lighting matrix...",
        "Querying identity records & Wikidata for name...",
        "Discovering related platform profiles...",
        "Downloading avatar profile pictures concurrently...",
        "Executing face correlation comparison matrix...",
        "Compiling biometric report...",
    ];

    // Start Camera
    const startCamera = async () => {
        setErr(null);
        setResults(null);
        setImageB64(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 400, height: 300, facingMode: "user" }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setCameraActive(true);
            }
        } catch (e: any) {
            setErr("Camera access denied or unavailable. Please upload an image file instead.");
        }
    };

    // Stop Camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    // Capture Frame
    const captureFrame = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg");
                setImageB64(dataUrl);
                stopCamera();
            }
        }
    };

    // Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageB64(reader.result as string);
                stopCamera();
                setResults(null);
            };
            reader.readAsDataURL(file);
        }
    };

    // Trigger Scan
    const runScan = async () => {
        if (!name.trim() || !imageB64) return;
        setLoading(true);
        setScanStep(0);
        setErr(null);
        setResults(null);

        // Simulation text interval
        const stepInterval = setInterval(() => {
            setScanStep(s => (s + 1) % SCAN_STEPS.length);
        }, 1200);

        try {
            const r = await fetch(`${apiBase}/api/face-search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    image_base64: imageB64,
                }),
            });
            if (!r.ok) {
                const text = await r.text();
                throw new Error(`Server returned HTTP ${r.status}: ${text}`);
            }
            const data = await r.json();
            setResults(data);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            clearInterval(stepInterval);
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const getMatchColor = (score: number) => {
        if (score >= 80) return "#22c55e"; // Green
        if (score >= 60) return "#eab308"; // Yellow
        return "#f43f5e"; // Red
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-4 space-y-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="text-cyan-400 w-5 h-5 animate-pulse" />
                    <h3 className="text-cyan-300 text-sm font-bold tracking-wider uppercase">
                        Biometric Face Scanner & Correlation
                    </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                    Lawful Identity Correlation Module
                </span>
            </div>

            {/* Input target name */}
            <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono block">SUSPECT TARGET FULL NAME</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name (e.g. Rahul Sharma)"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
            </div>

            {/* Camera Viewport & Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative aspect-[4/3] bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden flex flex-col items-center justify-center">
                    
                    {/* Live Video */}
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? "" : "hidden"}`}
                        playsInline
                        muted
                    />

                    {/* Captured Image Preview */}
                    {imageB64 && !cameraActive && (
                        <img
                            src={imageB64}
                            alt="Scan target face preview"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Glowing Scan HUD Overlay */}
                    {(cameraActive || loading) && (
                        <div className="absolute inset-0 border-[3px] border-cyan-500/10 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-dashed border-cyan-500/40 rounded-full animate-spin" style={{ animationDuration: "12s" }} />
                            <div className="absolute w-56 h-0.5 bg-cyan-500/30 top-1/2 left-0 right-0 animate-pulse" />
                            <div className="absolute top-2 left-2 text-[9px] text-cyan-400 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-cyan-900/30">
                                BIOMETRIC HUD ACTIVE
                            </div>
                        </div>
                    )}

                    {/* Empty State / Prompt */}
                    {!cameraActive && !imageB64 && (
                        <div className="text-center p-4 text-slate-500 space-y-2">
                            <Camera className="w-8 h-8 mx-auto opacity-40 text-cyan-400" />
                            <p className="text-[11px] font-mono">No target face data loaded.</p>
                            <p className="text-[9px] text-slate-600">Start camera or upload an image file.</p>
                        </div>
                    )}

                    {/* Canvas for snapshot capture */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                {/* Controls & Operations Console */}
                <div className="flex flex-col justify-between p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg">
                    <div className="space-y-3">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1.5">
                            Acquisition Controls
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {!cameraActive ? (
                                <button
                                    onClick={startCamera}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded border border-cyan-500/40 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 transition-all font-semibold"
                                >
                                    <Camera className="w-3.5 h-3.5" /> Start Feed
                                </button>
                            ) : (
                                <button
                                    onClick={captureFrame}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/15 transition-all font-semibold"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Capture Photo
                                </button>
                            )}

                            <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-semibold cursor-pointer text-center">
                                <Upload className="w-3.5 h-3.5" /> Upload File
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: "none" }}
                                />
                            </label>
                        </div>

                        {/* Status detail */}
                        {imageB64 && (
                            <div className="text-[10px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                                <span className="text-emerald-400">✓ Biometric frame locked.</span> Ready to correlate name &amp; scan target profiles.
                            </div>
                        )}
                    </div>

                    {/* Scanning Console progress display */}
                    {loading && (
                        <div className="mt-3 p-2.5 rounded bg-slate-900 border border-cyan-900/30 text-[10px] text-cyan-400 font-mono space-y-1 animate-pulse">
                            <div>❯ {SCAN_STEPS[scanStep]}</div>
                            <div className="text-slate-500">Connecting to public registry pools...</div>
                        </div>
                    )}

                    {err && <div className="text-red-400 text-[10px] font-mono mt-2">⚠ {err}</div>}

                    {/* Run action button */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <button
                            onClick={runScan}
                            disabled={loading || !name.trim() || !imageB64}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs rounded border border-cyan-500 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <User className="w-3.5 h-3.5" />
                            {loading ? "Matching Faces..." : "Execute Biometric Search"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Rendering */}
            {results && (
                <div className="space-y-3 fade-in pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
                        <span>Matched Profiles: {results.total} Found</span>
                        <span>Biometric verification list</span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {results.profiles?.map((p: any, i: number) => {
                            const icon = PLATFORM_ICONS[p.platform] || "🌐";
                            const matchScore = p.face_match_score;
                            
                            return (
                                <div
                                    key={i}
                                    className="p-3 bg-slate-950/30 border border-slate-800 rounded-lg flex items-center gap-3 hover:border-cyan-500/20 transition-all"
                                >
                                    {/* Avatar image / default placeholder */}
                                    <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                                        {p.avatar ? (
                                            <img src={p.avatar} alt="Avatar profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-slate-500 text-xs font-mono">{p.platform.slice(0, 2)}</span>
                                        )}
                                    </div>

                                    {/* Account info */}
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[14px]">{icon}</span>
                                            <span className="text-xs font-bold text-slate-200 truncate">{p.platform}</span>
                                            {p.username && (
                                                <span className="text-[10px] text-cyan-400 font-mono">@{p.username}</span>
                                            )}
                                        </div>
                                        {p.display_name && (
                                            <div className="text-[10px] text-slate-400 truncate font-semibold">{p.display_name}</div>
                                        )}
                                        {p.bio && (
                                            <div className="text-[9px] text-slate-500 line-clamp-1 italic">"{p.bio}"</div>
                                        )}
                                    </div>

                                    {/* Biometric Similarity Score Badge */}
                                    <div className="text-right shrink-0">
                                        {matchScore !== null && matchScore !== undefined ? (
                                            <div className="space-y-1">
                                                <div 
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 font-mono inline-block"
                                                    style={{ background: getMatchColor(matchScore) }}
                                                >
                                                    {matchScore}% MATCH
                                                </div>
                                                <div className="text-[8px] font-bold tracking-wider text-slate-500 uppercase">
                                                    {p.face_match_verdict === "strong_match" && "✓ Strong Correlation"}
                                                    {p.face_match_verdict === "possible_match" && "🔶 Possible Match"}
                                                    {p.face_match_verdict === "weak_signal" && "❓ Weak Signal"}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[9px] text-slate-500 font-mono">NO AVATAR</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {results.profiles?.length === 0 && (
                            <div className="text-center p-6 text-slate-500 font-mono text-[11px]">
                                🔍 No matching social profiles found. Try checking target name spelling.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
