"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Checkpoint {
    name: string;
    weight: number;
    result: number;
    contribution: number;
    status: "PASSED" | "FAILED" | "WARNING";
    reason?: string;
    priority?: string;
    detected_value?: string;
    bbox?: number[];
    page?: number;
}

interface ScoreBreakdownProps {
    checkpoints: Checkpoint[];
    finalScore: number;
    isCheckpointBased?: boolean;
    verdictLabel?: string;
    onSelectCheckpoint?: (checkpoint: Checkpoint) => void;
}

export function ScoreBreakdown({ checkpoints, finalScore, isCheckpointBased, verdictLabel, onSelectCheckpoint }: ScoreBreakdownProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!checkpoints || checkpoints.length === 0) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PASSED": return <CheckCircle2 className="w-3 h-3 text-success" />;
            case "FAILED": return <XCircle className="w-3 h-3 text-destructive" />;
            case "WARNING": return <AlertCircle className="w-3 h-3 text-warning" />;
            default: return <Info className="w-3 h-3 text-muted-foreground" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "PASSED": return "Pass";
            case "FAILED": return "Fail";
            case "WARNING": return "Partial";
            default: return "Unknown";
        }
    };

    return (
        <div className="mt-4 border border-border/50 rounded-xl overflow-hidden bg-background/30 transition-all duration-300">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary/70" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                        Checkpoint Calculation
                    </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
                <div className="p-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="overflow-x-auto rounded-lg border border-border/30">
                        <table className="w-full text-[10px] text-left mb-2">
                            <thead className="bg-secondary/50 text-muted-foreground font-black uppercase tracking-tighter">
                                <tr>
                                    <th className="px-3 py-2 border-r border-border/10">Checkpoint Info</th>
                                    <th className="px-2 py-2 text-center border-r border-border/10">Status</th>
                                    <th className="px-2 py-2 border-r border-border/10" style={{ color: '#00c2cb' }}>Detected Evidence</th>
                                    <th className="px-3 py-2">Justification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {checkpoints.map((cp, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => cp.status !== "PASSED" && onSelectCheckpoint?.(cp)}
                                        className={cn(
                                            "hover:bg-secondary/20 transition-colors",
                                            cp.status !== "PASSED" ? "cursor-pointer" : ""
                                        )}
                                    >
                                        <td className="px-3 py-2 border-r border-border/10">
                                            <div className="font-bold text-foreground/90">{cp.name}</div>
                                            {cp.priority && (
                                                <div className={cn(
                                                    "text-[8px] font-black tracking-widest uppercase mt-0.5 inline-block px-1.5 py-[1px] rounded",
                                                    cp.priority === "CRITICAL" ? "bg-destructive/10 text-destructive" : 
                                                    cp.priority === "HIGH" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                                                )}>
                                                    PRIORITY: {cp.priority}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 border-r border-border/10">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {getStatusIcon(cp.status)}
                                                <span className={cn(
                                                    "font-bold",
                                                    cp.status === "PASSED" ? "text-success" :
                                                        cp.status === "FAILED" ? "text-destructive" : "text-warning"
                                                )}>
                                                    {getStatusText(cp.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td
                                            className="px-2 py-2 border-r border-border/10"
                                            title={cp.detected_value || '—'}
                                            style={{
                                                fontFamily: 'monospace',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: cp.status === 'PASSED' ? 'var(--success)' : cp.status === 'FAILED' ? 'var(--destructive)' : 'var(--warning)',
                                                maxWidth: 160,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {cp.detected_value || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">{cp.reason || "Validation completed"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {!isCheckpointBased && (
                                <tfoot className="bg-primary/5 font-black border-t border-primary/20">
                                    <tr>
                                        <td colSpan={3} className="px-3 py-2 uppercase tracking-widest text-primary/80">
                                            Total Integrity Score
                                        </td>
                                        <td colSpan={2} className="px-3 py-2 text-right font-mono text-primary text-sm">
                                            {finalScore.toFixed(0)}%
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>

                        {/* Checkpoint Based Summary & Logic */}
                        {isCheckpointBased && (
                            <div className="bg-secondary/20 rounded-lg p-3 m-2 mt-0 border border-border/40 space-y-3">
                                <div className="flex items-center justify-between font-mono text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-muted-foreground tracking-tighter uppercase">Total Checkpoints:</span>
                                        <span className="font-bold text-foreground">{checkpoints.length}</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground tracking-tighter uppercase">Passed:</span>
                                            <span className="font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">{checkpoints.filter(c => c.status === "PASSED").length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground tracking-tighter uppercase">Failed:</span>
                                            <span className="font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{checkpoints.filter(c => c.status !== "PASSED").length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/40">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Final Classification Logic:</h4>
                                    <div className="flex gap-4 font-mono text-[10px]">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-success ring-2 ring-success/20"></span>
                                            <span className="text-muted-foreground">0 Failures <span className="text-border">→</span></span>
                                            <span className="font-bold text-success">GENUINE</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-warning ring-2 ring-warning/20"></span>
                                            <span className="text-muted-foreground">1 Fail or 3+ Warn <span className="text-border">→</span></span>
                                            <span className="font-bold text-warning">SUSPICIOUS</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-destructive ring-2 ring-destructive/20 animate-pulse"></span>
                                            <span className="text-muted-foreground">2+ Fails OR 1 CRITICAL <span className="text-border">→</span></span>
                                            <span className="font-bold text-destructive">FAKE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="p-3 text-[9px] text-muted-foreground italic leading-tight">
                        {isCheckpointBased
                            ? "* Validation based on multi-checkpoint verification. Click on failed items to locate violation."
                            : "* Final Score = Sum of (Weight × Check Result). Click on failed items to locate violation."}
                    </p>
                </div>
            )}
        </div>
    );
}
