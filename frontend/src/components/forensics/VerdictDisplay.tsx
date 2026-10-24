import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerdictDisplayProps {
    verdict: "GENUINE" | "SUSPICIOUS" | "LIKELY FORGED" | "REAL" | "FAKE" | "VERIFIED" | "VALID" | "SECURE" | "VIOLATION" | null;
    reasons: string[];
    isProcessing: boolean;
    confidenceScore?: number;
    anomalyScore?: number;
    mlScore?: number;
}

export function VerdictDisplay({ verdict, reasons, isProcessing, confidenceScore, anomalyScore, mlScore }: VerdictDisplayProps) {
    const isAuthentic = verdict === "REAL" || verdict === "GENUINE" || verdict === "VERIFIED" || verdict === "VALID" || verdict === "SECURE";
    const isSuspicious = verdict === "SUSPICIOUS";
    const isForged = verdict === "FAKE" || verdict === "LIKELY FORGED" || verdict === "VIOLATION";

    // Ensure confidence score is never shown as 0% if analysis was attempted
    const displayConfidence = Math.max(1, (confidenceScore || 0) > 1 ? (confidenceScore || 0) : (confidenceScore || 0) * 100);

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-semibold">Verdict Engine</h2>
                    <p className="text-xs text-muted-foreground">Final authentication decision</p>
                </div>
            </div>

            <div className={cn(
                "rounded-xl p-6 text-center transition-all duration-500",
                isAuthentic && "bg-success/10 border border-success/30",
                isSuspicious && "bg-warning/10 border border-warning/30",
                isForged && "bg-destructive/10 border border-destructive/30",
                !verdict && "bg-secondary/50 border border-border"
            )}>
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <Shield className="w-16 h-16 text-primary animate-pulse" />
                            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-foreground">ANALYZING</p>
                            <p className="text-sm text-muted-foreground mt-1">Processing forensic data...</p>
                        </div>
                    </div>
                ) : verdict ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className={cn(
                            "relative p-4 rounded-2xl",
                            isAuthentic ? "bg-success/20" : isSuspicious ? "bg-warning/20" : "bg-destructive/20"
                        )}>
                            {isAuthentic ? (
                                <ShieldCheck className="w-16 h-16 text-success" />
                            ) : isSuspicious ? (
                                <ShieldAlert className="w-16 h-16 text-warning" />
                            ) : (
                                <ShieldAlert className="w-16 h-16 text-destructive" />
                            )}
                            <div className={cn(
                                "absolute inset-0 rounded-2xl animate-pulse",
                                isAuthentic ? "bg-success/10" : isSuspicious ? "bg-warning/10" : "bg-destructive/10"
                            )} />
                        </div>
                        <div>
                            <p className={cn(
                                "text-3xl font-black tracking-widest font-mono",
                                isAuthentic ? "text-success" : isSuspicious ? "text-warning" : "text-destructive"
                            )}>
                                {isAuthentic ? "VERIFIED" : isSuspicious ? "SUSPICIOUS" : "INVALID"}
                            </p>
                            <p className={cn(
                                "text-sm mt-3 font-medium",
                                isAuthentic ? "text-success/80" : isSuspicious ? "text-warning/80" : "text-destructive/80"
                            )}>
                                {isAuthentic
                                    ? "Identity document verified as genuine."
                                    : isSuspicious
                                        ? "Identity document verified with borderline anomalies detected."
                                        : "Identity document failed integrity checks — possible manipulation."
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Shield className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Awaiting document for verification</p>
                    </div>
                )}
            </div>

            {verdict && !isProcessing && (
                <div className="mt-6 grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overall Confidence</span>
                            <span className="text-xs font-mono font-bold text-primary">{displayConfidence.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: `${displayConfidence}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Anomaly Score</p>
                            <p className="text-sm font-mono font-bold">{(anomalyScore || 0).toFixed(3)}</p>
                            <div className="h-1 w-full bg-muted mt-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-warning transition-all duration-1000"
                                    style={{ width: `${(anomalyScore || 0) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">ML Class Prob</p>
                            <p className="text-sm font-mono font-bold">{(mlScore || 0).toFixed(3)}</p>
                            <div className="h-1 w-full bg-muted mt-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all duration-1000"
                                    style={{ width: `${(mlScore || 0) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reasons.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Analysis Summary</p>
                    <div className="space-y-1.5">
                        {reasons.map((reason, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-start gap-2 p-2 rounded-lg text-sm",
                                    isAuthentic ? "bg-success/5" : "bg-destructive/5"
                                )}
                            >
                                {isAuthentic ? (
                                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-muted-foreground leading-tight">{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
