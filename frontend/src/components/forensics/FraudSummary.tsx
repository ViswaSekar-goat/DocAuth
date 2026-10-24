"use client";

import { AlertCircle, Flag, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FraudSummaryProps {
    fraudFlags: number;
    suspiciousFlags: number;
    issueTypes: string[];
    confidence: number;
    isProcessing: boolean;
    isCheckpointBased?: boolean;
    verdictLabel?: string;
}

export function FraudSummary({ fraudFlags, suspiciousFlags, issueTypes, confidence, isProcessing, isCheckpointBased, verdictLabel }: FraudSummaryProps) {
    const totalFlags = fraudFlags + suspiciousFlags;

    if (isProcessing) return null;

    const getVerdictInfo = () => {
        if (isCheckpointBased) {
            const v = (verdictLabel || "").toUpperCase();
            if (v === "REAL" || v === "GENUINE") return { label: "Real", color: "text-success", bg: "bg-success/5", border: "border-success/20", icon: <ShieldCheck className="w-5 h-5 text-success" /> };
            if (v === "SUSPICIOUS") return { label: "Suspicious", color: "text-warning", bg: "bg-warning/5", border: "border-warning/20", icon: <AlertCircle className="w-5 h-5 text-warning" /> };
            return { label: "Fake", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: <ShieldAlert className="w-5 h-5 text-destructive" /> };
        }
        if (confidence >= 85) return { label: "Likely Genuine", color: "text-success", bg: "bg-success/5", border: "border-success/20", icon: <ShieldCheck className="w-5 h-5 text-success" /> };
        if (confidence >= 70) return { label: "Needs Manual Review", color: "text-warning", bg: "bg-warning/5", border: "border-warning/20", icon: <AlertCircle className="w-5 h-5 text-warning" /> };
        if (confidence >= 50) return { label: "Suspicious", color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/20", icon: <ShieldAlert className="w-5 h-5 text-destructive animate-pulse" /> };
        return { label: "Likely Fraudulent", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: <ShieldAlert className="w-5 h-5 text-destructive animate-bounce" /> };
    };

    const info = getVerdictInfo();

    return (
        <div className={cn(
            "rounded-xl border p-4 transition-all duration-500 shadow-lg shadow-black/5",
            info.bg,
            info.border
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {info.icon}
                    <h3 className={cn(
                        "text-[10px] font-black uppercase tracking-tighter",
                        info.color
                    )}>
                        {info.label}
                    </h3>
                </div>
                {!isCheckpointBased && (
                    <div className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border",
                        info.bg,
                        info.border,
                        info.color
                    )}>
                        {confidence.toFixed(0)}% AUTHENTIC
                    </div>
                )}
            </div>

            {totalFlags > 0 ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/40 p-2 rounded-lg border border-destructive/10">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Critical Fraud</p>
                            <p className="text-xl font-black text-destructive leading-none">{fraudFlags}</p>
                        </div>
                        <div className="bg-background/40 p-2 rounded-lg border border-warning/10">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Suspicious</p>
                            <p className="text-xl font-black text-warning leading-none">{suspiciousFlags}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Flag className="w-2.5 h-2.5" />
                            Active Issue Categories
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {issueTypes.length > 0 ? issueTypes.map((type, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-secondary/50 border border-border/50 text-[9px] font-bold text-foreground/80 uppercase">
                                    {type}
                                </span>
                            )) : (
                                <span className="text-[9px] text-muted-foreground italic">No category data available</span>
                            )}
                        </div>
                    </div>

                    {!isCheckpointBased && (
                        <div className="pt-2 border-t border-destructive/10">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Fraud Confidence</span>
                                <span className="text-[10px] font-mono font-black text-destructive">{confidence.toFixed(1)}%</span>
                            </div>
                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-destructive transition-all duration-1000" style={{ width: `${confidence}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-2">
                    <p className="text-xs font-bold text-success">NO FRAUD DETECTED</p>
                    <p className="text-[10px] text-muted-foreground mt-1">All forensic checkpoints passed initial validation.</p>
                </div>
            )}
        </div>
    );
}
