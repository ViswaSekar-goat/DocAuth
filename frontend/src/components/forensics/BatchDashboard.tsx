import React, { useState } from "react";
import {
    CheckCircle2, AlertTriangle, XCircle, ChevronRight, ChevronDown,
    FileText, BarChart3, PieChart, Activity, Loader2, Info,
    ExternalLink, X, Search, ZoomIn, Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BatchItem, BatchSummary } from "@/hooks/useForensicAnalysis";
import { AnalysisResult } from "@/data/documents/types";
import { motion, AnimatePresence } from "framer-motion";

interface BatchDashboardProps {
    summary: BatchSummary;
    items: BatchItem[];
    onViewDetails: (result: AnalysisResult) => void;
    activeBank: string;
}

export function BatchDashboard({ summary, items, onViewDetails, activeBank }: BatchDashboardProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [inspecting, setInspecting] = useState<{ item: BatchItem, checkpoint: any } | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-secondary/40 border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 size={80} />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Processed</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-foreground">{summary.processed}</h3>
                        <span className="text-xs text-muted-foreground">/ {summary.total} files</span>
                    </div>
                </div>

                <div className="bg-secondary/40 border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-emerald-500/50">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500">
                        <CheckCircle2 size={80} />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Likely Genuine</p>
                    <h3 className="text-3xl font-bold text-emerald-500">{summary.genuine}</h3>
                </div>

                <div className="bg-secondary/40 border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-amber-500/50">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500">
                        <AlertTriangle size={80} />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requires Review</p>
                    <h3 className="text-3xl font-bold text-amber-500">{summary.suspicious + summary.fraudulent}</h3>
                </div>

                <div className="bg-secondary/40 border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-slate-400">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-400">
                        <Ban size={80} />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invalid Docs</p>
                    <h3 className="text-3xl font-bold text-slate-500">{summary.invalid}</h3>
                </div>
            </div>

            {/* Main Content Area: Structured Results Table */}
            <div className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                <div className="px-6 py-4 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm tracking-tight">Financial Audit Results — {activeBank} Model</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass
                        <span className="w-2 h-2 rounded-full bg-rose-500 ml-2" /> Fail
                        <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" /> Suspicious
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-secondary/10 border-b border-border/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[320px]">Document Name</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-[120px]">Processing</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-[200px]">Checkpoints</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-[140px]">Final Result</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remarks</th>
                                <th className="px-6 py-4 w-[60px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {items.map((item) => {
                                const isInvalid = item.status === 'invalid';
                                const verdict = item.result?.verdict || (isInvalid ? "INVALID" : item.status === 'failed' ? "FAILED" : "PENDING");
                                const isExpanded = expandedId === item.id;
                                const hasCheckpoints = item.status === 'completed' && item.result?.checkpoints && item.result.checkpoints.length > 0;

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr
                                            className={cn(
                                                "hover:bg-secondary/20 transition-colors group cursor-pointer",
                                                isInvalid && "bg-secondary/5 opacity-80",
                                                isExpanded && "bg-primary/5"
                                            )}
                                            onClick={() => hasCheckpoints && toggleExpand(item.id)}
                                        >
                                            {/* 1. Document Name */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-4 h-4 transition-transform duration-300",
                                                        !hasCheckpoints && "opacity-0",
                                                        isExpanded ? "rotate-180" : "rotate-0"
                                                    )}>
                                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                        verdict === 'VERIFIED' || verdict === 'REAL' || verdict === 'GENUINE' ? "bg-emerald-500/10 text-emerald-500" :
                                                            verdict === 'FAKE' || verdict === 'LIKELY FORGED' ? "bg-rose-500/10 text-rose-500" :
                                                                isInvalid ? "bg-slate-500/10 text-slate-500" : "bg-primary/10 text-primary"
                                                    )}>
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                                            {item.file.name}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">
                                                            {(item.file.size / 1024).toFixed(1)} KB • {item.file.type.split('/')[1]?.toUpperCase() || 'PDF'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Processing Status */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {item.status === 'processing' ? (
                                                        <div className="flex items-center gap-1.5 text-primary">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-tight">Checking</span>
                                                        </div>
                                                    ) : item.status === 'completed' ? (
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">Completed</span>
                                                    ) : item.status === 'invalid' ? (
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Invalid</span>
                                                    ) : item.status === 'failed' ? (
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Failed</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">Pending</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3. Checkpoint Grid (Interactive) */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[180px] mx-auto">
                                                    {isInvalid || item.status === 'failed' ? (
                                                        <span className="text-muted-foreground font-bold">—</span>
                                                    ) : item.status === 'completed' && item.result?.checkpoints ? (
                                                        item.result.checkpoints.map((cp: any, idx: number) => (
                                                            <button
                                                                key={idx}
                                                                title={`${cp.name}: ${cp.result === 1.0 ? 'PASS' : 'FAIL'}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setInspecting({ item, checkpoint: cp });
                                                                }}
                                                                className="hover:scale-125 transition-transform"
                                                            >
                                                                {cp.result === 1.0 ? (
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                                <div key={i} className="w-3.5 h-3.5 rounded-full border border-dashed border-muted-foreground/30" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 4. Final Result */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border",
                                                    verdict === 'VERIFIED' || verdict === 'REAL' || verdict === 'GENUINE'
                                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
                                                        verdict === 'FAKE' || verdict === 'LIKELY FORGED'
                                                            ? "bg-rose-500/10 text-rose-700 border-rose-500/30" :
                                                            verdict === 'SUSPICIOUS'
                                                                ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
                                                                isInvalid || verdict === 'INVALID' ? "bg-slate-200/50 text-slate-600 border-slate-300" :
                                                                    "bg-secondary text-muted-foreground border-border"
                                                )}>
                                                    {verdict}
                                                </span>
                                            </td>

                                            {/* 5. Remarks */}
                                            <td className="px-6 py-4">
                                                <p className={cn(
                                                    "text-[11px] font-medium leading-tight truncate",
                                                    isInvalid || verdict === 'FAKE' ? "text-rose-500" : "text-muted-foreground"
                                                )}>
                                                    {item.status === 'invalid' ? "Invalid document format" :
                                                        item.result?.remarks || item.error || item.result?.reasons?.[0] || (item.status === 'completed' ? "Valid bank internal structure" : "Awaiting analysis...")}
                                                </p>
                                            </td>

                                            {/* Action */}
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'completed' && item.result && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewDetails(item.result!);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all group/btn"
                                                        title="Full Fraud Report"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW: Checkpoint Breakdown */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.tr
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-primary/[0.02]"
                                                >
                                                    <td colSpan={6} className="p-0 overflow-hidden">
                                                        <div className="px-16 py-6 border-b border-border/30 grid grid-cols-2 gap-x-12 gap-y-4">
                                                            <div className="col-span-2 mb-2 flex items-center gap-2">
                                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Checkpoint Validation Breakdown</h5>
                                                                <div className="h-px flex-1 bg-border/40" />
                                                            </div>
                                                            {item.result?.checkpoints?.map((cp: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    className="group/cp flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/30 transition-all cursor-help"
                                                                    onClick={() => setInspecting({ item, checkpoint: cp })}
                                                                >
                                                                    <div className={cn(
                                                                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                                                                        cp.result === 1.0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                                    )}>
                                                                        {cp.result === 1.0 ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <p className="text-xs font-bold text-foreground truncate">{cp.name}</p>
                                                                            <p className={cn("text-[10px] font-black uppercase", cp.result === 1.0 ? "text-emerald-500" : "text-rose-500")}>
                                                                                {cp.result === 1.0 ? "Pass" : "Fail"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[9px] text-muted-foreground uppercase font-black px-1.5 py-0.5 bg-secondary rounded tracking-tight">Weight: {cp.weight}%</span>
                                                                            <p className="text-[10px] text-muted-foreground truncate italic">
                                                                                {cp.reason || "Verification successful"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover/cp:opacity-100 transition-opacity">
                                                                        <Search size={14} className="text-primary" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INSPECTION SIDEBAR (Step 5 & 6) */}
            <AnimatePresence>
                {inspecting && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100]"
                            onClick={() => setInspecting(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-[450px] bg-card border-l border-border shadow-2xl z-[101] flex flex-col"
                        >
                            <div className="p-6 border-b border-border bg-secondary/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center border-2",
                                        inspecting.checkpoint.result === 1.0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                    )}>
                                        {inspecting.checkpoint.result === 1.0 ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-tight leading-none mb-1">Checkpoint Audit</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Ref: {activeBank}_VERIFY_{inspecting.checkpoint.name.toUpperCase().replace(/\s+/g, '_')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setInspecting(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                    <X size={20} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Details Card */}
                                <div className="space-y-4">
                                    <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Status</span>
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", inspecting.checkpoint.result === 1.0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                                {inspecting.checkpoint.result === 1.0 ? "Verified Pass" : "Critical Failure"}
                                            </span>
                                        </div>
                                        <div className="h-px bg-border/20" />
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest block">Audit Target</span>
                                            <p className="text-sm font-bold text-foreground">{inspecting.checkpoint.name}</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest block">Detected Data (Audit Evidence)</span>
                                                {inspecting.checkpoint.detected ? (
                                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 font-mono text-[10px] text-primary space-y-2 max-h-[150px] overflow-y-auto">
                                                        {typeof inspecting.checkpoint.detected === 'object' ? (
                                                            Array.isArray(inspecting.checkpoint.detected) ? (
                                                                inspecting.checkpoint.detected.map((row: any, i: number) => (
                                                                    <div key={i} className="border-b border-primary/10 pb-1 last:border-0 last:pb-0">
                                                                        {Object.entries(row).map(([k, v]) => (
                                                                            <div key={k} className="flex gap-2">
                                                                                <span className="opacity-60">{k}:</span>
                                                                                <span className="font-bold">{String(v)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                Object.entries(inspecting.checkpoint.detected).map(([k, v]) => (
                                                                    <div key={k} className="flex gap-2">
                                                                        <span className="opacity-60 uppercase text-[8px]">{k.replace('_', ' ')}:</span>
                                                                        <span className="font-bold truncate">{String(v)}</span>
                                                                    </div>
                                                                ))
                                                            )
                                                        ) : (
                                                            <p className="font-bold break-all">{inspecting.checkpoint.detected}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs font-mono font-bold text-primary break-all">{inspecting.checkpoint.detected_value || "—"}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1 mt-2">
                                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest block">Expected Calibration</span>
                                                <p className="text-xs font-mono font-medium text-foreground bg-secondary/50 p-2 rounded border border-border/40">
                                                    {inspecting.checkpoint.expected || inspecting.checkpoint.expected_value || "Schema Match"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] uppercase font-black text-primary tracking-widest block">Audit Logic Summary</span>
                                                <p className="text-xs text-foreground leading-relaxed mt-1">
                                                    {inspecting.checkpoint.reason || "The system verified the structural integrity and historical consistency of this field against the master fingerprint."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Evidence (Step 6) */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Localized Evidence</span>
                                        <div className="flex gap-2">
                                            <button className="p-1.5 bg-secondary border border-border/50 rounded shadow-sm hover:bg-border transition-colors">
                                                <ZoomIn size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative aspect-[3/4] bg-slate-900 rounded-xl border border-border overflow-hidden group">
                                        {inspecting.item.result?.viewUrls?.[0] ? (
                                            <>
                                                <img
                                                    src={inspecting.item.result.viewUrls[0]}
                                                    alt="Audit Evidence"
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale-[50%] group-hover:grayscale-0"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                    <p className="text-[10px] text-white/70 font-medium italic">Document Verification: {inspecting.checkpoint.name}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-secondary/40">
                                                <Activity className="w-8 h-8 opacity-20" />
                                                <span className="text-xs font-medium italic">Generating visual localized report...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-border bg-secondary/10">
                                <button
                                    onClick={() => setInspecting(null)}
                                    className="w-full py-3 bg-foreground text-background font-black uppercase text-[10px] tracking-widest rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Finish Audit Review
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h6 className="text-xs font-black text-primary uppercase tracking-tight">Interactive Forensic Hub Active</h6>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        Expand documents to view structural checkpoints. Click individual markers to inspect localized evidence and fingerprint mismatches in the sidebar.
                    </p>
                </div>
            </div>
        </div>
    );
}
